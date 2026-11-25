import { Hono } from "hono";
import { isAddress, getAddress } from "viem";
import { z } from "zod";
import { formatNaira, fromUnits, toUnits, txUrl } from "./chain";
import { env } from "./env";
import { getGateway } from "./payments";
import { liveRate, priceFor, purchase } from "./purchase";
import { getVerifier } from "./selfgate";
import { liveChain, settlePending, settleTicket } from "./settle";
import { chainPulse, liveStats } from "./stats";
import { getStore, type EventRec, type TicketRec } from "./store";
import { checkAdmin, hashKey, newAdminKey, newId, parseTicketCode, slugify, ticketCode } from "./tickets";

export type Defer = (job: () => Promise<unknown>) => void;

const CreateEvent = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(1200).default(""),
  venue: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(60),
  startsAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid date"),
  priceNaira: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, "price in naira, e.g. 5000"),
  capacity: z.coerce.number().int().min(1).max(100_000),
  perPersonLimit: z.coerce.number().int().min(1).max(10).default(1),
  minAge: z.coerce.number().int().refine((n) => n === 0 || n === 18 || n === 21, "0, 18 or 21").default(0),
  humansOnly: z.boolean().default(true),
  organizerName: z.string().trim().min(2).max(60),
  payoutAddress: z.string().refine((a) => isAddress(a), "not a wallet address"),
});

export function publicEvent(e: EventRec, sold: number) {
  return {
    slug: e.slug,
    title: e.title,
    description: e.description,
    venue: e.venue,
    city: e.city,
    startsAt: e.startsAt,
    priceNgn: e.priceNgn,
    priceLabel: formatNaira(BigInt(e.priceNgn)),
    capacity: e.capacity,
    sold,
    remaining: Math.max(0, e.capacity - sold),
    perPersonLimit: e.perPersonLimit,
    minAge: e.minAge,
    humansOnly: e.humansOnly,
    organizerName: e.organizerName,
    buyUrl: `${env.baseUrl}/api/events/${e.slug}/buy`,
    pageUrl: `${env.baseUrl}/e/${e.slug}`,
  };
}

function settleDeps() {
  return { store: getStore(), chain: liveChain() };
}

export function buildApi(defer: Defer) {
  const app = new Hono().basePath("/api");

  app.get("/health", (c) => c.json({ ok: true, chainId: 42220 }));

  app.get("/rate", async (c) => {
    const rate = await liveRate();
    return c.json({ ngnPerUsdt: rate, source: "Textile FX USDT_NGN" });
  });

  // Live numbers for the landing page. All real, nothing simulated.
  app.get("/stats", async (c) => {
    c.header("cache-control", "public, s-maxage=10, stale-while-revalidate=30");
    return c.json(await liveStats());
  });

  app.get("/chain", async (c) => {
    c.header("cache-control", "public, s-maxage=4, stale-while-revalidate=10");
    return c.json(await chainPulse());
  });

  app.get("/events", async (c) => {
    const store = getStore();
    const events = await store.listEvents(100);
    const now = Date.now();
    const out = await Promise.all(events.map(async (e) => publicEvent(e, (await store.listTickets(e.id)).length)));
    return c.json({ events: out.filter((e) => Date.parse(e.startsAt) > now - 6 * 3600_000) });
  });

  app.post("/events", async (c) => {
    const parsed = CreateEvent.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: "invalid", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
    const d = parsed.data;
    const adminKey = newAdminKey();
    const event: EventRec = {
      id: newId("evt"),
      slug: slugify(d.title),
      title: d.title,
      description: d.description,
      venue: d.venue,
      city: d.city,
      startsAt: new Date(d.startsAt).toISOString(),
      priceNgn: toUnits(d.priceNaira, 6).toString(),
      capacity: d.capacity,
      perPersonLimit: d.perPersonLimit,
      minAge: d.minAge,
      humansOnly: d.humansOnly,
      organizerName: d.organizerName,
      payoutAddress: getAddress(d.payoutAddress),
      adminKeyHash: hashKey(adminKey),
      createdAt: new Date().toISOString(),
    };
    await getStore().createEvent(event);
    return c.json({
      slug: event.slug,
      adminKey,
      pageUrl: `${env.baseUrl}/e/${event.slug}`,
      dashboardUrl: `${env.baseUrl}/dashboard/${event.slug}#key=${adminKey}`,
    }, 201);
  });

  app.get("/events/:slug", async (c) => {
    const store = getStore();
    const e = await store.getEventBySlug(c.req.param("slug"));
    if (!e) return c.json({ error: "not_found" }, 404);
    const sold = (await store.listTickets(e.id)).length;
    let priceUsdt: string | null = null;
    try {
      priceUsdt = fromUnits((await priceFor(e, await liveRate())).usdt, 6);
    } catch {
      priceUsdt = null;
    }
    return c.json({ ...publicEvent(e, sold), priceUsdt });
  });

  // The ticket counter. Agents call this with a Self Agent ID signature and pay over x402.
  app.post("/events/:slug/buy", async (c) => {
    const store = getStore();
    const e = await store.getEventBySlug(c.req.param("slug"));
    if (!e) return c.json({ error: "not_found" }, 404);
    const rawBody = await c.req.text();
    const res = await purchase(
      e,
      { method: c.req.method, url: c.req.url, rawBody, header: (n) => c.req.header(n) },
      { store, verifier: getVerifier(), gateway: getGateway() },
    );
    if (res.toSettle) {
      const t = res.toSettle;
      defer(() => settleTicket(t, settleDeps()));
    }
    for (const [k, v] of Object.entries(res.headers)) c.header(k, v);
    return c.json(res.body, res.status as 200);
  });

  app.get("/tickets/:id", async (c) => {
    const store = getStore();
    const t = await store.getTicket(c.req.param("id"));
    if (!t) return c.json({ error: "not_found" }, 404);
    const e = await store.getEvent(t.eventId);
    return c.json({
      id: t.id,
      code: ticketCode(t.id),
      status: t.status,
      checkedInAt: t.checkedInAt ?? null,
      event: e ? publicEvent(e, 0) : null,
      paid: { token: t.paidToken, amount: t.paidAmount, tx: t.paymentTx, txUrl: txUrl(t.paymentTx) },
      organizerPayout: { status: t.settleStatus, ngn: t.ngnDelivered ?? null, tx: t.payoutTx ?? null },
    });
  });

  // Organizer dashboard data. The admin key is shown once, at event creation.
  app.get("/events/:slug/admin", async (c) => {
    const store = getStore();
    const e = await store.getEventBySlug(c.req.param("slug"));
    if (!e) return c.json({ error: "not_found" }, 404);
    if (!checkAdmin(e, c.req.header("x-admin-key"))) return c.json({ error: "forbidden" }, 403);
    const tickets = await store.listTickets(e.id);
    const rejections = await store.rejections(e.id);
    const ngnIn = tickets.reduce((s, t) => s + BigInt(t.ngnDelivered ?? "0"), 0n);
    const byReason: Record<string, number> = {};
    for (const r of rejections) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
    return c.json({
      event: publicEvent(e, tickets.length),
      payoutAddress: e.payoutAddress,
      totals: {
        sold: tickets.length,
        checkedIn: tickets.filter((t) => t.status === "used").length,
        ngnDelivered: ngnIn.toString(),
        ngnDeliveredLabel: formatNaira(ngnIn),
        pendingPayouts: tickets.filter((t) => t.settleStatus === "pending" || t.settleStatus === "converting" || t.settleStatus === "failed").length,
        blocked: rejections.length,
        blockedByReason: byReason,
      },
      tickets: tickets.map((t: TicketRec) => ({
        id: t.id,
        createdAt: t.createdAt,
        status: t.status,
        paidToken: t.paidToken,
        paidAmount: t.paidAmount,
        paymentTx: t.paymentTx,
        settleStatus: t.settleStatus,
        swapTx: t.swapTx ?? null,
        payoutTx: t.payoutTx ?? null,
        ngnDelivered: t.ngnDelivered ?? null,
      })),
      recentBlocked: rejections.slice(-20).reverse(),
    });
  });

  // Door scanner.
  app.post("/events/:slug/checkin", async (c) => {
    const store = getStore();
    const e = await store.getEventBySlug(c.req.param("slug"));
    if (!e) return c.json({ error: "not_found" }, 404);
    if (!checkAdmin(e, c.req.header("x-admin-key"))) return c.json({ error: "forbidden" }, 403);
    const { code } = (await c.req.json().catch(() => ({}))) as { code?: string };
    const id = code ? parseTicketCode(code) : null;
    if (!id) return c.json({ result: "invalid", message: "Not a Kovenra ticket" }, 200);
    const t = await store.getTicket(id);
    if (!t || t.eventId !== e.id) return c.json({ result: "invalid", message: "Ticket is for a different event" }, 200);
    const done = await store.checkIn(id, new Date().toISOString());
    if (!done) return c.json({ result: "used", message: `Already used at ${t.checkedInAt ?? "an earlier scan"}` }, 200);
    return c.json({ result: "ok", message: "Welcome in", ticketId: id }, 200);
  });

  // Public proof: every sale with its on-chain transactions. No personal data.
  app.get("/proof", async (c) => {
    const store = getStore();
    const tickets = await store.allTickets(300);
    const events = new Map<string, EventRec | null>();
    for (const t of tickets) if (!events.has(t.eventId)) events.set(t.eventId, await store.getEvent(t.eventId));
    return c.json({
      sales: tickets.map((t) => ({
        event: events.get(t.eventId)?.title ?? "",
        at: t.createdAt,
        paidToken: t.paidToken,
        paidAmount: t.paidAmount,
        paymentTx: t.paymentTx,
        swapTx: t.swapTx ?? null,
        payoutTx: t.payoutTx ?? null,
        ngnDelivered: t.ngnDelivered ?? null,
      })),
    });
  });

  // Retries conversions/payouts that didn't finish. Called by Vercel Cron.
  app.get("/settle/run", async (c) => {
    const auth = c.req.header("authorization");
    if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return c.json({ error: "forbidden" }, 403);
    const done = await settlePending(settleDeps());
    return c.json({ processed: done.length, results: done.map((t) => ({ id: t.id, status: t.settleStatus, error: t.settleError ?? null })) });
  });

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "server_error", message: err.message }, 500);
  });

  return app;
}
