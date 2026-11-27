import type { PaymentRequirements } from "@x402/core/types";
import { getAddress, type Address } from "viem";
import { TOKENS } from "./chain";
import { env, settlerAddressFromEnv } from "./env";
import { encodeRequired, encodeResponse, matchRequirement, readPaymentHeader, type PaymentGateway } from "./payments";
import type { HumanVerifier } from "./selfgate";
import type { EventRec, Store, TicketRec } from "./store";
import { dropCheck } from "./drop";
import { getUsdtNgn, usdtForNaira } from "./textile";
import { holdKeyFor, newId, ticketCode } from "./tickets";

export interface PurchaseRequest {
  method: string;
  url: string; // full request URL
  rawBody: string;
  header: (name: string) => string | undefined | null;
}

export interface PurchaseResponse {
  status: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  /** Set when a ticket was issued and its USD₮ still needs converting. */
  toSettle?: TicketRec;
}

export interface PurchaseDeps {
  store: Store;
  verifier: HumanVerifier;
  gateway: PaymentGateway;
  rate?: () => Promise<string>; // NGN per USD₮
  now?: () => number;
  settler?: Address;
}

const SELF_HELP = "https://docs.self.xyz/agent-id/quickstart";

/** Live NGN per USD₮ from Textile's public feed, cached briefly. */
let rateCache: { v: string; at: number } | null = null;
export async function liveRate(): Promise<string> {
  if (rateCache && Date.now() - rateCache.at < 30_000) return rateCache.v;
  const fresh = getUsdtNgn().then((t) => {
    rateCache = { v: t.ask && Number(t.ask) > 0 ? t.ask : t.last_price, at: Date.now() };
    return rateCache.v;
  });
  // If Textile is slow and we have a recent rate (under 5 minutes), use it rather than make the fan wait.
  if (rateCache && Date.now() - rateCache.at < 5 * 60_000) {
    const stale = rateCache.v;
    return Promise.race([fresh, new Promise<string>((r) => setTimeout(() => r(stale), 2500))]).catch(() => stale);
  }
  return fresh;
}

export async function priceFor(event: EventRec, rate: string) {
  const ngn = BigInt(event.priceNgn);
  return { ngn, usdt: usdtForNaira(ngn, rate, env.fxBufferBps) };
}

function json(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}): PurchaseResponse {
  return { status, body, headers };
}

/**
 * Accept the buyer's signed requirement if it pays the right wallet in the
 * right token and at least 99% of today's price. The 1% tolerance covers the
 * rate moving between the 402 and the paid retry.
 */
function acceptable(paid: PaymentRequirements | undefined, offered: PaymentRequirements[]): PaymentRequirements | null {
  if (!paid) return null;
  for (const o of offered) {
    if (
      o.scheme === paid.scheme &&
      o.network === paid.network &&
      o.asset.toLowerCase() === String(paid.asset).toLowerCase() &&
      o.payTo.toLowerCase() === String(paid.payTo).toLowerCase() &&
      BigInt(paid.amount) * 100n >= BigInt(o.amount) * 99n
    ) {
      return { ...o, amount: String(paid.amount), extra: { ...o.extra } };
    }
  }
  return null;
}

export async function purchase(event: EventRec, req: PurchaseRequest, deps: PurchaseDeps): Promise<PurchaseResponse> {
  const now = deps.now?.() ?? Date.now();
  const { store } = deps;

  if (new Date(event.startsAt).getTime() + 6 * 3600_000 < now) {
    return json(410, { error: "event_over", message: "This event has ended." });
  }

  // 1. Who is buying? Self Agent ID decides whether this agent gets served at all.
  let nullifier = "0";
  // Open events have no human id; give each request its own hold so buyers never share one.
  let agentAddress = `anon:${newId("h")}`;
  let agentId = "0";
  if (event.humansOnly) {
    const gate = await deps.verifier.check(
      {
        signature: req.header("x-self-agent-signature") ?? undefined,
        timestamp: req.header("x-self-agent-timestamp") ?? undefined,
        method: req.method,
        url: req.url,
        rawBody: req.rawBody,
      },
      event.minAge,
    );
    if (!gate.ok) {
      await store.logRejection({
        eventId: event.id,
        reason: gate.reason,
        agent: gate.agentAddress ?? req.header("x-self-agent-address") ?? "unknown",
        at: new Date(now).toISOString(),
      });
      const message =
        gate.reason === "too_young"
          ? `This event is ${event.minAge}+. The verified human behind this agent is not old enough.`
          : "Tickets for this event are sold only to agents with a verified human behind them (Self Agent ID). Bots and unverified agents are turned away.";
      return json(403, { error: "human_verification_required", reason: gate.reason, detail: gate.detail, message, howToVerify: SELF_HELP });
    }
    nullifier = gate.nullifier;
    agentAddress = gate.agentAddress;
    agentId = gate.agentId;
  }

  // 1b. Fair drop: only drawn winners (then any entrant) may buy.
  if (event.mode === "fair-drop" && event.drop) {
    const d = await dropCheck(event, nullifier, store, now);
    if (!d.ok) return json(d.status, d.body);
  }

  // 2. One person, N tickets: hold a seat counted against this human, across all their agents.
  const limitMessage = `Limit reached: ${event.perPersonLimit} ticket${event.perPersonLimit > 1 ? "s" : ""} per person. Your other agents share this limit.`;
  const holdKey = holdKeyFor(event.id, nullifier, agentAddress);
  const held = await store.hold(event.id, nullifier, holdKey, now, { capacity: event.capacity, perPerson: event.perPersonLimit });
  let listing: TicketRec | null = null;
  if (!held) {
    const seats = await store.seatsTaken(event.id, now);
    const mine = nullifier !== "0" ? await store.humanCount(event.id, nullifier, now) : 0;
    if (seats < event.capacity || mine >= event.perPersonLimit) {
      await store.logRejection({ eventId: event.id, reason: "per_person_limit", agent: agentAddress, at: new Date(now).toISOString() });
      return json(429, { error: "per_person_limit", message: limitMessage });
    }
    // Sold out: a ticket handed back by its owner can be bought at face value, never above.
    listing = await store.claimListing(event.id, holdKey, now);
    if (!listing) return json(409, { error: "sold_out", message: "Sold out. Tickets handed back by their owners reappear here at face value." });
  }

  // 3. Price in naira, payable in USD₮ (converted for the organizer) or cNGN (straight to them).
  //    Resale: both options pay Kovenra's wallet, which pays the seller face value.
  const settler = deps.settler ?? settlerAddressFromEnv();
  if (!settler) return json(503, { error: "not_configured", message: "Ticket sales are not switched on yet." });
  const price = await priceFor(event, await (deps.rate ?? liveRate)());
  const offered = await deps.gateway.requirements({ settler, organizer: listing ? settler : getAddress(event.payoutAddress), price });
  const description = listing ? `1 ticket (face-value resale): ${event.title}` : `1 ticket: ${event.title}`;

  const payload = readPaymentHeader(req.header);
  if (!payload) {
    const pr = await deps.gateway.paymentRequired(offered, req.url, description);
    return json(402, { ...pr, kovenra: { event: event.slug, priceNgn: price.ngn.toString(), priceUsdt: price.usdt.toString() } } as never, {
      "PAYMENT-REQUIRED": encodeRequired(pr),
    });
  }

  const paidReq = matchRequirement(payload, offered) ?? acceptable(payload.accepted, offered);
  if (!paidReq) {
    const pr = await deps.gateway.paymentRequired(offered, req.url, description, "payment_does_not_match_offer");
    return json(402, pr as never, { "PAYMENT-REQUIRED": encodeRequired(pr) });
  }

  // 4. Settle on-chain first. Only a confirmed payment becomes a ticket.
  const settled = await deps.gateway.verifyAndSettle(payload, paidReq);
  if (!settled.success || !settled.transaction) {
    const pr = await deps.gateway.paymentRequired(offered, req.url, description, settled.errorReason ?? "settlement_failed");
    return json(402, { ...pr, detail: settled.errorMessage } as never, { "PAYMENT-REQUIRED": encodeRequired(pr) });
  }

  const paidToken = paidReq.asset.toLowerCase() === TOKENS.CNGN.address.toLowerCase() ? "CNGN" : "USDT";
  const ticket: TicketRec = {
    id: newId("tkt"),
    eventId: event.id,
    nullifier,
    agentId,
    buyer: settled.payer ?? agentAddress,
    paidToken,
    paidAmount: paidReq.amount,
    paymentTx: settled.transaction,
    status: "valid",
    createdAt: new Date(now).toISOString(),
    settleStatus: listing ? "pending" : paidToken === "CNGN" ? "direct" : "pending",
    ngnDelivered: !listing && paidToken === "CNGN" ? paidReq.amount : undefined,
    resale: listing ? { fromTicket: listing.id, seller: listing.listing!.seller } : undefined,
  };
  if (listing) await store.completeResale(listing.id, ticket, holdKey);
  else await store.addTicket(ticket, holdKey);

  return {
    status: 200,
    headers: { "PAYMENT-RESPONSE": encodeResponse(settled) },
    body: {
      ticket: {
        id: ticket.id,
        code: ticketCode(ticket.id),
        url: `${env.baseUrl}/t/${ticket.id}`,
        event: { title: event.title, startsAt: event.startsAt, venue: event.venue, city: event.city },
        paid: { token: paidToken, amount: paidReq.amount, tx: settled.transaction },
        resale: Boolean(listing),
      },
    },
    toSettle: listing || paidToken === "USDT" ? ticket : undefined,
  };
}
