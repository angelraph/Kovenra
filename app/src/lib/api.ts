import { Hono } from "hono";
import { isAddress, getAddress } from "viem";
import { z } from "zod";
import { formatNaira, fromUnits, toUnits, txUrl } from "./chain";
import { env } from "./env";
import { getGateway } from "./payments";
import { liveRate, priceFor, purchase } from "./purchase";
import { getVerifier } from "./selfgate";
import { liveChain, settlePending, settleTicket } from "./settle";
import { identityStatus, registerIdentity, updateIdentityURI } from "./erc8004";
import { chainPulse, liveStats } from "./stats";
import { countsAsSeat, getStore, type EventRec, type TicketRec } from "./store";
import { drawResult, ensureDraw, entryHash, phase as dropPhase } from "./drop";
import { fairnessReport } from "./report";
import { checkSendOrder, createSendOrder } from "./sendpay";
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
  mode: z.enum(["first-come", "fair-drop"]).default("first-come"),
  entryClosesAt: z.string().optional(),
  claimMinutes: z.coerce.number().int().min(10).max(24 * 60).default(60),
});

export function publicEvent(e: EventRec, sold: number, entries?: number) {
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
    mode: e.mode ?? "first-come",
    drop: e.mode === "fair-drop" && e.drop
      ? { ...e.drop, phase: dropPhase(e, Date.now()), entries: entries ?? null, enterUrl: `${env.baseUrl}/api/events/${e.slug}/enter` }
      : null,
    buyUrl: `${env.baseUrl}/api/events/${e.slug}/buy`,
    pageUrl: `${env.baseUrl}/e/${e.slug}`,
    reportUrl: `${env.baseUrl}/e/${e.slug}/fair`,
  };
}

/** Seats sold (tickets replaced through resale don't count twice). */
export const soldOf = (tickets: TicketRec[]) => tickets.filter(countsAsSeat).length;

function settleDeps() {
  return { store: getStore(), chain: liveChain() };
}

export function buildApi(defer: Defer) {
  const app = new Hono().basePath("/api");

  app.get("/health", (c) =>
    c.json({
      ok: true,
      chainId: 42220,
      // Which storage is live: "postgres" once DATABASE_URL is set, otherwise a temporary file.
      store: env.databaseUrl ? "postgres" : "temporary",
      payments: Boolean(env.x402ApiKey),
      settlement: Boolean(env.settlerKey),
    }),
  );

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

  // Kovenra's own ERC-8004 identity (official Identity Registry on Celo mainnet).
  app.get("/identity", async (c) => {
    c.header("cache-control", "public, s-maxage=30");
    return c.json(await identityStatus());
  });

  const ownerOnly = (auth: string | undefined) => Boolean(process.env.CRON_SECRET) && auth === `Bearer ${process.env.CRON_SECRET}`;

  app.post("/identity/register", async (c) => {
    if (!ownerOnly(c.req.header("authorization"))) return c.json({ error: "forbidden", message: "Wrong password." }, 403);
    const r = await registerIdentity();
    return c.json({ ok: true, ...r, txUrl: txUrl(r.tx) });
  });

  app.post("/identity/update-uri", async (c) => {
    if (!ownerOnly(c.req.header("authorization"))) return c.json({ error: "forbidden", message: "Wrong password." }, 403);
    const tx = await updateIdentityURI();
    return c.json({ ok: true, tx, txUrl: txUrl(tx) });
  });

  app.get("/events", async (c) => {
    const store = getStore();
    const events = await store.listEvents(100);
    const now = Date.now();
    const out = await Promise.all(events.map(async (e) => publicEvent(e, soldOf(await store.listTickets(e.id)))));
    return c.json({ events: out.filter((e) => Date.parse(e.startsAt) > now - 6 * 3600_000) });
  });

  app.post("/events", async (c) => {
    const parsed = CreateEvent.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: "invalid", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
    const d = parsed.data;
    let drop: EventRec["drop"];
    if (d.mode === "fair-drop") {
      const closes = d.entryClosesAt ? Date.parse(d.entryClosesAt) : NaN;
      if (!d.humansOnly) return c.json({ error: "invalid", issues: ["A fair drop needs the verified-humans rule switched on."] }, 400);
      if (Number.isNaN(closes) || closes < Date.now() + 5 * 60_000) return c.json({ error: "invalid", issues: ["Entries must close at least 5 minutes from now."] }, 400);
      if (closes + d.claimMinutes * 60_000 > Date.parse(d.startsAt)) return c.json({ error: "invalid", issues: ["Entries and the claim window must end before the event starts."] }, 400);
      drop = { entryClosesAt: new Date(closes).toISOString(), claimMinutes: d.claimMinutes };
    }
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
      perPersonLimit: drop ? 1 : d.perPersonLimit,
      minAge: d.minAge,
      humansOnly: d.humansOnly,
      organizerName: d.organizerName,
      payoutAddress: getAddress(d.payoutAddress),
      adminKeyHash: hashKey(adminKey),
      createdAt: new Date().toISOString(),
      mode: d.mode,
      drop,
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
    const found = await store.getEventBySlug(c.req.param("slug"));
    if (!found) return c.json({ error: "not_found" }, 404);
    const e = await ensureDraw(found, store).catch(() => found);
    const sold = soldOf(await store.listTickets(e.id));
    const entries = e.mode === "fair-drop" ? (await store.listEntries(e.id)).length : undefined;
    let priceUsdt: string | null = null;
    try {
      priceUsdt = fromUnits((await priceFor(e, await liveRate())).usdt, 6);
    } catch {
      priceUsdt = null;
    }
    return c.json({ ...publicEvent(e, sold, entries), priceUsdt });
  });

  // Fair drop: enter the draw. One entry per verified human (all their agents share it).
  app.post("/events/:slug/enter", async (c) => {
    const store = getStore();
    const e = await store.getEventBySlug(c.req.param("slug"));
    if (!e) return c.json({ error: "not_found" }, 404);
    if (e.mode !== "fair-drop" || !e.drop) return c.json({ error: "not_a_drop", message: "This event sells first come, first served." }, 400);
    const now = Date.now();
    if (dropPhase(e, now) !== "entries") return c.json({ error: "entries_closed", message: "Entries for this drop are closed." }, 409);
    const rawBody = await c.req.text();
    const gate = await getVerifier().check(
      { signature: c.req.header("x-self-agent-signature") ?? undefined, timestamp: c.req.header("x-self-agent-timestamp") ?? undefined, method: "POST", url: c.req.url, rawBody },
      e.minAge,
    );
    if (!gate.ok) {
      await store.logRejection({ eventId: e.id, reason: gate.reason, agent: gate.agentAddress ?? c.req.header("x-self-agent-address") ?? "unknown", at: new Date(now).toISOString() });
      return c.json({ error: "human_verification_required", reason: gate.reason, message: "Only verified people can enter a fair drop. Bots and unverified agents are turned away." }, 403);
    }
    const h = entryHash(e.id, gate.nullifier);
    const added = await store.addEntry({ eventId: e.id, nullifier: gate.nullifier, entryHash: h, agent: gate.agentAddress, at: new Date(now).toISOString() });
    const total = (await store.listEntries(e.id)).length;
    return c.json({ entered: true, alreadyEntered: !added, entry: h, entries: total, entryClosesAt: e.drop.entryClosesAt,
      message: added ? "You're in the draw. Winners are picked from a Celo block when entries close." : "You're already in the draw. One entry per person, whichever agent you use." });
  });

  // Fair drop: am I in, and did I win? Signed GET so only the human's own agent can ask.
  app.get("/events/:slug/entry", async (c) => {
    const store = getStore();
    const found = await store.getEventBySlug(c.req.param("slug"));
    if (!found || found.mode !== "fair-drop" || !found.drop) return c.json({ error: "not_found" }, 404);
    const e = await ensureDraw(found, store).catch(() => found);
    const gate = await getVerifier().check(
      { signature: c.req.header("x-self-agent-signature") ?? undefined, timestamp: c.req.header("x-self-agent-timestamp") ?? undefined, method: "GET", url: c.req.url, rawBody: "" },
      e.minAge,
    );
    if (!gate.ok) return c.json({ error: "human_verification_required", reason: gate.reason }, 403);
    const h = entryHash(e.id, gate.nullifier);
    const entries = await store.listEntries(e.id);
    const entered = entries.some((x) => x.entryHash === h);
    const r = drawResult(e, entries);
    const place = r ? r.order.indexOf(h) + 1 : null;
    const claimUntil = e.drop!.drawAt ? new Date(Date.parse(e.drop!.drawAt) + e.drop!.claimMinutes * 60_000).toISOString() : null;
    return c.json({ phase: dropPhase(e, Date.now()), entered, entry: entered ? h : null, entries: entries.length, place: entered ? place : null, winner: Boolean(r && entered && r.winners.has(h)), claimUntil });
  });

  // Fair drop: the public draw, with everything needed to check it.
  app.get("/events/:slug/draw", async (c) => {
    const store = getStore();
    const found = await store.getEventBySlug(c.req.param("slug"));
    if (!found || found.mode !== "fair-drop") return c.json({ error: "not_found" }, 404);
    const e = await ensureDraw(found, store).catch(() => found);
    return c.json((await fairnessReport(e, store)).drop);
  });

  // The fairness report: who got in, who was turned away, resales, the draw, every transaction.
  app.get("/events/:slug/report", async (c) => {
    const store = getStore();
    const found = await store.getEventBySlug(c.req.param("slug"));
    if (!found) return c.json({ error: "not_found" }, 404);
    const e = await ensureDraw(found, store).catch(() => found);
    c.header("cache-control", "public, s-maxage=15");
    return c.json(await fairnessReport(e, store));
  });

  // Face-value resale: the holder hands the ticket back. Proof of ownership is the ticket code.
  app.post("/tickets/:id/resell", async (c) => {
    const store = getStore();
    const { code, payoutAddress } = (await c.req.json().catch(() => ({}))) as { code?: string; payoutAddress?: string };
    const t = await store.getTicket(c.req.param("id"));
    if (!t || !code || parseTicketCode(code) !== t.id) return c.json({ error: "forbidden", message: "That ticket code doesn't match." }, 403);
    if (!payoutAddress || !isAddress(payoutAddress)) return c.json({ error: "invalid", message: "Add the wallet where you want your money back." }, 400);
    const e = await store.getEvent(t.eventId);
    if (!e || Date.parse(e.startsAt) < Date.now()) return c.json({ error: "event_started", message: "This event has already started." }, 409);
    if (t.status !== "valid") return c.json({ error: "not_resellable", message: t.status === "listed" ? "This ticket is already listed." : "This ticket can't be resold." }, 409);
    await store.updateTicket(t.id, { status: "listed", listing: { seller: getAddress(payoutAddress), at: new Date().toISOString() } });
    return c.json({ listed: true, message: "Listed at face value. When someone buys it, your QR stops working and the money goes to your wallet." });
  });

  app.post("/tickets/:id/unlist", async (c) => {
    const store = getStore();
    const { code } = (await c.req.json().catch(() => ({}))) as { code?: string };
    const t = await store.getTicket(c.req.param("id"));
    if (!t || !code || parseTicketCode(code) !== t.id) return c.json({ error: "forbidden", message: "That ticket code doesn't match." }, 403);
    if (t.status !== "listed") return c.json({ error: "not_listed", message: "This ticket isn't listed." }, 409);
    if ((t.listing?.holdUntil ?? 0) > Date.now()) return c.json({ error: "in_checkout", message: "Someone is buying this ticket right now. Try again in a few minutes." }, 409);
    await store.updateTicket(t.id, { status: "valid", listing: null as never });
    return c.json({ listed: false, message: "Your ticket is yours again." });
  });

  // The ticket counter. Agents call this with a Self Agent ID signature and pay over x402.
  app.post("/events/:slug/buy", async (c) => {
    const store = getStore();
    const found = await store.getEventBySlug(c.req.param("slug"));
    if (!found) return c.json({ error: "not_found" }, 404);
    const e = await ensureDraw(found, store).catch(() => found);
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

  // Pay by sending: for wallets that can't open web pages (MiniPay opens only listed apps).
  app.post("/events/:slug/send-order", async (c) => {
    const store = getStore();
    const e = await store.getEventBySlug(c.req.param("slug"));
    if (!e) return c.json({ error: "not_found" }, 404);
    const { from } = (await c.req.json().catch(() => ({}))) as { from?: string };
    const r = await createSendOrder(e, from ?? "", { store });
    return c.json(r.body, r.status as 200);
  });

  app.post("/send-orders/check", async (c) => {
    const store = getStore();
    const { order } = (await c.req.json().catch(() => ({}))) as { order?: string };
    const r = await checkSendOrder(order ?? "", { store });
    if (r.toSettle) {
      const t = r.toSettle;
      defer(() => settleTicket(t, settleDeps()));
    }
    return c.json(r.body, r.status as 200);
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
      listed: t.status === "listed",
      resale: t.resale ? { fromTicket: t.resale.fromTicket, sellerPaidTx: t.resale.sellerPaidTx ?? null } : null,
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
    const all = await store.listTickets(e.id);
    const tickets = all.filter(countsAsSeat);
    const rejections = await store.rejections(e.id);
    const ngnIn = tickets.reduce((s, t) => s + (t.resale ? 0n : BigInt(t.ngnDelivered ?? "0")), 0n);
    const byReason: Record<string, number> = {};
    for (const r of rejections) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
    const entries = e.mode === "fair-drop" ? (await store.listEntries(e.id)).length : undefined;
    return c.json({
      event: publicEvent(e, tickets.length, entries),
      payoutAddress: e.payoutAddress,
      totals: {
        sold: tickets.length,
        resales: all.filter((t) => t.resale).length,
        listed: all.filter((t) => t.status === "listed").length,
        entries: entries ?? null,
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
    if (t.status === "resold") return c.json({ result: "invalid", message: "This ticket was resold. The QR no longer works." }, 200);
    if (t.status === "listed") return c.json({ result: "invalid", message: "This ticket was handed back for resale. Ask the holder to cancel the listing first." }, 200);
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
    const store = getStore();
    // Run any fair-drop draws that are due, so the claim window starts on time even with no visitors.
    let draws = 0;
    for (const e of await store.listEvents(500)) {
      if (e.mode === "fair-drop" && e.drop && !e.drop.drawSeed) {
        const after = await ensureDraw(e, store).catch(() => e);
        if (after.drop?.drawSeed) draws++;
      }
    }
    const done = await settlePending(settleDeps());
    return c.json({ draws, processed: done.length, results: done.map((t) => ({ id: t.id, status: t.settleStatus, error: t.settleError ?? null })) });
  });

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "server_error", message: err.message }, 500);
  });

  return app;
}
