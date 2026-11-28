import { encodePaymentSignatureHeader } from "@x402/core/http";
import type { PaymentPayload, PaymentRequirements, SettleResponse } from "@x402/core/types";
import { decodeFunctionData, erc20Abi, getAddress, type Address, type Hex } from "viem";
import { beforeEach, describe, expect, it } from "vitest";
import { attributionCodes, readTag, tagCalldata } from "./attribution";
import { NETWORK, TOKENS, toUnits } from "./chain";
import type { PaymentGateway } from "./payments";
import { purchase, type PurchaseDeps, type PurchaseRequest } from "./purchase";
import type { GateInput, GateResult, HumanVerifier } from "./selfgate";
import { settleTicket, type Chain } from "./settle";
import { MemoryStore, setStoreForTests, type EventRec, type TicketRec } from "./store";
import { buildApi } from "./api";
import { confirmAtDoor, needsDoorCheck } from "./door";
import { cleanHandle, readProfile } from "./agentbuy";
import type { FirmQuote } from "./textile";
import { usdtForNaira } from "./textile";
import { hashKey, parseTicketCode, ticketCode } from "./tickets";
import { entryHash, rank } from "./drop";
import { checkSendOrder, createSendOrder } from "./sendpay";

const SETTLER = getAddress("0x1111111111111111111111111111111111111111");
const ORGANIZER = getAddress("0x2222222222222222222222222222222222222222");
const RATE = "1443.84"; // NGN per USD₮

// Two agents that belong to the same human (same nullifier), one stranger, one minor.
const AGENTS: Record<string, { nullifier: string; olderThan: number }> = {
  "0xa1": { nullifier: "777", olderThan: 18 },
  "0xa2": { nullifier: "777", olderThan: 18 },
  "0xb1": { nullifier: "888", olderThan: 18 },
  "0xc1": { nullifier: "999", olderThan: 0 },
};

class FakeVerifier implements HumanVerifier {
  async check(input: GateInput, minAge: number): Promise<GateResult> {
    if (!input.signature) return { ok: false, reason: "unsigned", detail: "no signature" };
    const a = AGENTS[input.signature];
    if (!a) return { ok: false, reason: "not_verified", detail: "no human proof", agentAddress: input.signature };
    if (minAge > 0 && a.olderThan < minAge) return { ok: false, reason: "too_young", detail: "", agentAddress: input.signature };
    return { ok: true, agentId: "1", agentAddress: input.signature, nullifier: a.nullifier, olderThan: a.olderThan };
  }
}

class FakeGateway implements PaymentGateway {
  settled: PaymentRequirements[] = [];
  fail = false;
  async requirements(p: { settler: Address; organizer: Address; price: { usdt: bigint; ngn: bigint } }) {
    const base = { scheme: "exact", network: NETWORK, maxTimeoutSeconds: 120 };
    return [
      { ...base, asset: TOKENS.USDT.address, amount: p.price.usdt.toString(), payTo: p.settler, extra: { name: "Tether USD", version: "1" } },
      { ...base, asset: TOKENS.CNGN.address, amount: p.price.ngn.toString(), payTo: p.organizer, extra: { name: "cNGN", version: "1", assetTransferMethod: "permit2" } },
    ] as PaymentRequirements[];
  }
  async paymentRequired(reqs: PaymentRequirements[], url: string, description: string, error?: string) {
    return { x402Version: 2, error, resource: { url, description, mimeType: "application/json" }, accepts: reqs };
  }
  async verifyAndSettle(_p: PaymentPayload, req: PaymentRequirements): Promise<SettleResponse> {
    if (this.fail) return { success: false, errorReason: "insufficient_funds", transaction: "", network: NETWORK } as SettleResponse;
    this.settled.push(req);
    return { success: true, transaction: `0xpay${this.settled.length}`, network: NETWORK, payer: "0xbuyer" } as SettleResponse;
  }
}

function makeEvent(over: Partial<EventRec> = {}): EventRec {
  return {
    id: "evt_1",
    slug: "rooftop-jam",
    title: "Rooftop Jam",
    description: "",
    venue: "The Vault",
    city: "Lagos",
    startsAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
    priceNgn: toUnits("15000", 6).toString(),
    capacity: 3,
    perPersonLimit: 1,
    minAge: 18,
    humansOnly: true,
    organizerName: "Ada",
    payoutAddress: ORGANIZER,
    adminKeyHash: hashKey("admin"),
    createdAt: new Date().toISOString(),
    ...over,
  };
}

function req(agent: string | null, payment?: PaymentPayload): PurchaseRequest {
  const h: Record<string, string> = {};
  if (agent) {
    h["x-self-agent-signature"] = agent;
    h["x-self-agent-timestamp"] = String(Date.now());
  }
  if (payment) h["payment-signature"] = encodePaymentSignatureHeader(payment);
  return { method: "POST", url: "https://kovenra.xyz/api/events/rooftop-jam/buy", rawBody: '{"quantity":1}', header: (n) => h[n.toLowerCase()] };
}

function pay(accepted: PaymentRequirements): PaymentPayload {
  return { x402Version: 2, accepted, payload: { signature: "0xsig" } };
}

describe("ticket counter", () => {
  let store: MemoryStore;
  let gateway: FakeGateway;
  let deps: PurchaseDeps;
  let event: EventRec;

  beforeEach(async () => {
    store = new MemoryStore();
    gateway = new FakeGateway();
    deps = { store, verifier: new FakeVerifier(), gateway, rate: async () => RATE, settler: SETTLER };
    event = makeEvent();
    await store.createEvent(event);
  });

  async function buy(agent: string) {
    const first = await purchase(event, req(agent), deps);
    if (first.status !== 402) return first;
    const accepts = (first.body as { accepts: PaymentRequirements[] }).accepts;
    return purchase(event, req(agent, pay(accepts[0])), deps);
  }

  it("turns away a request with no Self Agent ID and logs it", async () => {
    const r = await purchase(event, req(null), deps);
    expect(r.status).toBe(403);
    expect(r.body.error).toBe("human_verification_required");
    expect(gateway.settled).toHaveLength(0);
    expect((await store.rejections(event.id))[0].reason).toBe("unsigned");
  });

  it("turns away an agent whose human is not verified", async () => {
    const r = await purchase(event, req("0xbot"), deps);
    expect(r.status).toBe(403);
    expect(r.body.reason).toBe("not_verified");
  });

  it("turns away an under-18 human at an 18+ event", async () => {
    const r = await purchase(event, req("0xc1"), deps);
    expect(r.status).toBe(403);
    expect(r.body.reason).toBe("too_young");
  });

  it("offers USD₮ to Kovenra and cNGN straight to the organizer, priced from the naira price", async () => {
    const r = await purchase(event, req("0xa1"), deps);
    expect(r.status).toBe(402);
    expect(r.headers["PAYMENT-REQUIRED"]).toBeTruthy();
    const [usdt, cngn] = (r.body as { accepts: PaymentRequirements[] }).accepts;
    expect(usdt.payTo).toBe(SETTLER);
    expect(usdt.amount).toBe(usdtForNaira(toUnits("15000", 6), RATE, 60).toString());
    expect(cngn.payTo).toBe(ORGANIZER);
    expect(cngn.amount).toBe(toUnits("15000", 6).toString());
  });

  it("issues a ticket only after the payment settles, and queues the naira conversion", async () => {
    const r = await buy("0xa1");
    expect(r.status).toBe(200);
    const ticket = (r.body as { ticket: { id: string; code: string } }).ticket;
    expect(parseTicketCode(ticket.code)).toBe(ticket.id);
    expect(r.toSettle?.paidToken).toBe("USDT");
    expect((await store.listTickets(event.id))).toHaveLength(1);
  });

  it("gives no ticket when settlement fails", async () => {
    gateway.fail = true;
    const r = await buy("0xa1");
    expect(r.status).toBe(402);
    expect(await store.listTickets(event.id)).toHaveLength(0);
  });

  it("makes two agents of the same person share one limit", async () => {
    expect((await buy("0xa1")).status).toBe(200);
    const second = await purchase(event, req("0xa2"), deps);
    expect(second.status).toBe(429);
    expect(second.body.error).toBe("per_person_limit");
    expect((await buy("0xb1")).status).toBe(200); // a different person is fine
  });

  it("also blocks the same person's second agent while the first is mid-payment", async () => {
    const first = await purchase(event, req("0xa1"), deps);
    expect(first.status).toBe(402);
    expect((await purchase(event, req("0xa2"), deps)).status).toBe(429);
  });

  it("stops at capacity", async () => {
    const small = makeEvent({ id: "evt_2", slug: "tiny", capacity: 1 });
    await store.createEvent(small);
    const first = await purchase(small, req("0xa1"), deps);
    const accepts = (first.body as { accepts: PaymentRequirements[] }).accepts;
    expect((await purchase(small, req("0xa1", pay(accepts[0])), deps)).status).toBe(200);
    expect((await purchase(small, req("0xb1"), deps)).status).toBe(409);
  });

  it("rejects an underpayment", async () => {
    const first = await purchase(event, req("0xa1"), deps);
    const usdt = (first.body as { accepts: PaymentRequirements[] }).accepts[0];
    const cheap = { ...usdt, amount: (BigInt(usdt.amount) / 2n).toString() };
    const r = await purchase(event, req("0xa1", pay(cheap)), deps);
    expect(r.status).toBe(402);
    expect(gateway.settled).toHaveLength(0);
  });

  it("marks cNGN payments as paid directly to the organizer", async () => {
    const first = await purchase(event, req("0xa1"), deps);
    const cngn = (first.body as { accepts: PaymentRequirements[] }).accepts[1];
    const r = await purchase(event, req("0xa1", pay(cngn)), deps);
    expect(r.status).toBe(200);
    expect(r.toSettle).toBeUndefined();
    expect((await store.listTickets(event.id))[0].settleStatus).toBe("direct");
  });

  it("checks a ticket in once, never twice", async () => {
    const r = await buy("0xa1");
    const id = (r.body as { ticket: { id: string } }).ticket.id;
    expect(await store.checkIn(id, new Date().toISOString())).not.toBeNull();
    expect(await store.checkIn(id, new Date().toISOString())).toBeNull();
  });

  describe("VIP door check", () => {
    const gate = (sig: string | undefined): GateInput => ({ signature: sig, timestamp: sig ? "1" : undefined, method: "POST", url: "https://kovenra.xyz/api/events/rooftop-jam/door-confirm", rawBody: "{}" });
    async function ticketFor(agent: string) {
      const r = await buy(agent);
      return (r.body as { ticket: { id: string } }).ticket.id;
    }

    it("only runs on verified-humans events that switched it on", () => {
      expect(needsDoorCheck(makeEvent({ doorCheck: true }), { nullifier: "777" })).toBe(true);
      expect(needsDoorCheck(makeEvent(), { nullifier: "777" })).toBe(false);
      expect(needsDoorCheck(makeEvent({ doorCheck: true, humansOnly: false }), { nullifier: "0" })).toBe(false);
    });

    it("lets the buyer in when a fresh proof from the same passport matches", async () => {
      const id = await ticketFor("0xa1");
      // 0xa2 is a different agent of the same person (same nullifier), like a one-time agent made at the gate.
      const r = await confirmAtDoor({ store, verifier: new FakeVerifier() }, event, id, gate("0xa2"));
      expect(r.result).toBe("ok");
      expect((await store.getTicket(id))?.status).toBe("used");
      const again = await confirmAtDoor({ store, verifier: new FakeVerifier() }, event, id, gate("0xa2"));
      expect(again.result).toBe("used");
    });

    it("turns away someone else holding the buyer's ticket", async () => {
      const id = await ticketFor("0xa1");
      const r = await confirmAtDoor({ store, verifier: new FakeVerifier() }, event, id, gate("0xb1"));
      expect(r.result).toBe("mismatch");
      expect((await store.getTicket(id))?.status).toBe("valid");
    });

    it("refuses when there is no valid Self proof", async () => {
      const id = await ticketFor("0xa1");
      expect((await confirmAtDoor({ store, verifier: new FakeVerifier() }, event, id, gate(undefined))).result).toBe("self_failed");
      expect((await confirmAtDoor({ store, verifier: new FakeVerifier() }, event, id, gate("0xbad"))).result).toBe("self_failed");
    });
  });
});

describe("settlement to the organizer", () => {
  it("converts USD₮ on Textile, then pays the organizer the cNGN it received", async () => {
    const store = new MemoryStore();
    const event = makeEvent();
    await store.createEvent(event);
    await store.addTicket(
      {
        id: "tkt_x", eventId: event.id, nullifier: "777", agentId: "1", buyer: "0xbuyer", paidToken: "USDT",
        paidAmount: "10500000", paymentTx: "0xpay", status: "valid", createdAt: new Date().toISOString(), settleStatus: "pending",
      },
      "hold",
    );
    const sent: { to: Address; data: Hex }[] = [];
    const chain: Chain = {
      address: SETTLER,
      allowance: async () => 0n,
      send: async (to, data) => {
        sent.push({ to, data });
        return `0xtx${sent.length}` as Hex;
      },
      signTyped: async () => "0xsig",
    };
    const quote = async (): Promise<FirmQuote> => ({
      rfqId: "rfq_1", claimToken: "c", sellAmount: 10_500_000n, buyAmount: 15_150_000_000n, feeAmount: 2000n,
      takerPays: 10_500_000n, reactor: getAddress("0xa9AA0a64769cBed4d3B1Ceb4Df01CdE915C235b3"),
      expiresAt: new Date(Date.now() + 60_000), swap: { to: getAddress("0xa9AA0a64769cBed4d3B1Ceb4Df01CdE915C235b3"), data: "0xdeadbeef" },
    });
    const t = await settleTicket((await store.getTicket("tkt_x"))!, { store, chain, quote, submit: async () => undefined });
    expect(t.settleStatus).toBe("paid");
    expect(sent).toHaveLength(3); // approve, swap, payout
    expect(sent[0].to).toBe(TOKENS.USDT.address);
    expect(sent[1].data).toBe("0xdeadbeef");
    const payout = decodeFunctionData({ abi: erc20Abi, data: sent[2].data });
    expect(sent[2].to).toBe(TOKENS.CNGN.address);
    expect(payout.functionName).toBe("transfer");
    expect(payout.args).toEqual([ORGANIZER, 15_150_000_000n]);
    expect((await store.getTicket("tkt_x"))?.payoutTx).toBe("0xtx3");
  });
});

describe("attribution and tickets", () => {
  it("appends the ERC-8021 tag without changing the call", () => {
    const call = "0xa9059cbb0000" as Hex;
    const tagged = tagCalldata(call);
    expect(tagged.startsWith(call)).toBe(true);
    expect(readTag(tagged)).toEqual(attributionCodes());
  });

  it("rejects a forged ticket code", () => {
    const code = ticketCode("tkt_abcDEF123");
    expect(parseTicketCode(code)).toBe("tkt_abcDEF123");
    expect(parseTicketCode(code.replace("abc", "abd"))).toBeNull();
    expect(parseTicketCode("kv1.tkt_abcDEF123.AAAAAAAAAAAAAAAA")).toBeNull();
  });

  it("prices naira in USD₮ with a buffer, never below Textile's $1 floor", () => {
    expect(usdtForNaira(toUnits("1443.84", 6), "1443.84", 0)).toBe(1_000_000n);
    expect(usdtForNaira(toUnits("14438.4", 6), "1443.84", 60)).toBe(10_060_000n);
    expect(usdtForNaira(toUnits("100", 6), "1443.84", 60)).toBe(1_000_000n);
  });
});

describe("agent identity", () => {
  it("serves an ERC-8004 registration document with the services agents need", async () => {
    const { kovenraAgentDocument } = await import("./agentCard");
    const doc = kovenraAgentDocument("https://kovenra.xyz");
    expect(doc.type).toBe("https://eips.ethereum.org/EIPS/eip-8004#registration-v1");
    expect(doc.name).toBe("Kovenra");
    const names = doc.services.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(["web", "agent-skill", "x402-buy"]));
    expect(doc.services.every((s) => s.endpoint.startsWith("https://kovenra.xyz"))).toBe(true);
    expect(doc.selfAgentId.requiresVerifiedHuman).toBe(true);
  });

  it("fills the site address into the skill file", async () => {
    const { skillMarkdown } = await import("./skill");
    const md = skillMarkdown("https://kovenra.xyz", 42);
    expect(md).toContain("POST https://kovenra.xyz/api/events/{slug}/buy");
    expect(md).toContain("agent #42");
    expect(md).toContain("USD₮");
  });
});
describe("fair drop", () => {
  const seed = "0x" + "ab".repeat(32);
  let store: MemoryStore;
  let deps: PurchaseDeps;

  async function setup(over: Partial<EventRec>) {
    store = new MemoryStore();
    deps = { store, verifier: new FakeVerifier(), gateway: new FakeGateway(), rate: async () => RATE, settler: SETTLER };
    const e = makeEvent({ capacity: 1, minAge: 0, mode: "fair-drop", ...over });
    await store.createEvent(e);
    for (const n of ["777", "888"]) await store.addEntry({ eventId: e.id, nullifier: n, entryHash: entryHash(e.id, n), agent: "0x", at: new Date().toISOString() });
    return e;
  }

  it("won't sell while entries are open", async () => {
    const e = await setup({ drop: { entryClosesAt: new Date(Date.now() + 3600_000).toISOString(), claimMinutes: 60 } });
    const r = await purchase(e, req("0xa1"), deps);
    expect(r.status).toBe(409);
    expect(r.body.error).toBe("drop_entries_open");
  });

  it("lets only the drawn winner buy during the claim window, then opens to every entrant", async () => {
    const drawAt = new Date(Date.now() - 60_000).toISOString();
    const e = await setup({ drop: { entryClosesAt: new Date(Date.now() - 120_000).toISOString(), claimMinutes: 30, drawSeed: seed, drawBlock: "1", drawAt } });
    const order = rank([{ entryHash: entryHash(e.id, "777") }, { entryHash: entryHash(e.id, "888") }], seed as `0x${string}`);
    const winnerAgent = order[0] === entryHash(e.id, "777") ? "0xa1" : "0xb1";
    const loserAgent = winnerAgent === "0xa1" ? "0xb1" : "0xa1";
    expect((await purchase(e, req(loserAgent), deps)).body.error).toBe("drop_not_won");
    expect((await purchase(e, req(winnerAgent), deps)).status).toBe(402);
    // after the claim window, anyone who entered may buy (the winner's hold has since lapsed in this test)
    const later = { ...deps, now: () => Date.now() + 31 * 60_000 + 6 * 60_000 };
    expect((await purchase(e, req(loserAgent), later)).status).toBe(402);
  });

  it("refuses people who never entered", async () => {
    const e = await setup({ drop: { entryClosesAt: new Date(Date.now() - 120_000).toISOString(), claimMinutes: 30, drawSeed: seed, drawBlock: "1", drawAt: new Date().toISOString() } });
    await store.createEvent({ ...e, id: "evt_x", slug: "x" }).catch(() => undefined);
    AGENTS["0xd1"] = { nullifier: "555", olderThan: 30 };
    expect((await purchase(e, req("0xd1"), deps)).body.error).toBe("drop_not_entered");
  });

  it("ranks entries the same way every time (anyone can recompute it)", () => {
    const xs = ["1", "2", "3", "4"].map((n) => ({ entryHash: entryHash("evt", n) }));
    expect(rank(xs, seed as `0x${string}`)).toEqual(rank([...xs].reverse(), seed as `0x${string}`));
  });
});

describe("face-value resale", () => {
  it("sells a handed-back ticket at face value, retires the old QR and pays the seller", async () => {
    const store = new MemoryStore();
    const gateway = new FakeGateway();
    const deps: PurchaseDeps = { store, verifier: new FakeVerifier(), gateway, rate: async () => RATE, settler: SETTLER };
    const e = makeEvent({ capacity: 1, minAge: 0 });
    await store.createEvent(e);
    const buyNow = async (agent: string) => {
      const first = await purchase(e, req(agent), deps);
      if (first.status !== 402) return first;
      const accepts = (first.body as { accepts: PaymentRequirements[] }).accepts;
      return purchase(e, req(agent, pay(accepts[0])), deps);
    };
    const first = await buyNow("0xb1");
    expect(first.status).toBe(200);
    const oldId = (first.body as { ticket: { id: string } }).ticket.id;
    expect((await purchase(e, req("0xa1"), deps)).status).toBe(409); // sold out, nothing listed

    const SELLER = getAddress("0x3333333333333333333333333333333333333333");
    await store.updateTicket(oldId, { status: "listed", listing: { seller: SELLER, at: new Date().toISOString() } });
    const offer = await purchase(e, req("0xa1"), deps);
    expect(offer.status).toBe(402);
    const accepts = (offer.body as { accepts: PaymentRequirements[] }).accepts;
    expect(accepts.every((a) => a.payTo === SETTLER)).toBe(true); // resale money goes via Kovenra to the seller
    expect(accepts[0].amount).toBe(usdtForNaira(toUnits("15000", 6), RATE, 60).toString()); // face value, never more
    const bought = await purchase(e, req("0xa1", pay(accepts[0])), deps);
    expect(bought.status).toBe(200);
    expect((await store.getTicket(oldId))?.status).toBe("resold");
    const fresh = bought.toSettle!;
    expect(fresh.resale?.seller).toBe(SELLER);
    expect((await store.seatsTaken(e.id, Date.now()))).toBe(1);

    const sent: { to: string; data: string }[] = [];
    const chain: Chain = { address: SETTLER, allowance: async () => 0n, send: async (to, data) => { sent.push({ to, data }); return "0xrefund" as Hex; }, signTyped: async () => "0x" as Hex };
    const done = await settleTicket(fresh, { store, chain });
    expect(done.settleStatus).toBe("paid");
    const call = decodeFunctionData({ abi: erc20Abi, data: sent[0].data as Hex });
    expect(call.functionName).toBe("transfer");
    expect((call.args as [Address, bigint])[0]).toBe(SELLER);
    expect((call.args as [Address, bigint])[1]).toBe(BigInt(accepts[0].amount));
  });

  it("stops one human's two agents from each claiming a different resale ticket when sold out", async () => {
    // perPersonLimit 1, capacity 2, both seats listed for resale by two unrelated sellers.
    const store = new MemoryStore();
    const gateway = new FakeGateway();
    const deps: PurchaseDeps = { store, verifier: new FakeVerifier(), gateway, rate: async () => RATE, settler: SETTLER };
    const event = makeEvent({ capacity: 2 });
    await store.createEvent(event);
    const listing1: TicketRec = {
      id: "tkt_L1", eventId: event.id, nullifier: "555", agentId: "1", buyer: "0xs1", paidToken: "USDT",
      paidAmount: "1000000", paymentTx: "0xpayL1", status: "listed", createdAt: new Date().toISOString(), settleStatus: "paid",
      listing: { seller: "0x5555555555555555555555555555555555555555", at: new Date(0).toISOString() },
    };
    const listing2: TicketRec = {
      id: "tkt_L2", eventId: event.id, nullifier: "666", agentId: "1", buyer: "0xs2", paidToken: "USDT",
      paidAmount: "1000000", paymentTx: "0xpayL2", status: "listed", createdAt: new Date().toISOString(), settleStatus: "paid",
      listing: { seller: "0x6666666666666666666666666666666666666666", at: new Date(1).toISOString() },
    };
    await store.addTicket(listing1, "holdL1");
    await store.addTicket(listing2, "holdL2");

    // 0xa1 (nullifier 777) has claimed the first listing but hasn't paid for it yet.
    const claimed = await store.claimListing(event.id, "holdForA1", Date.now(), "777", event.perPersonLimit);
    expect(claimed?.id).toBe(listing1.id);

    // 0xa1's second agent, 0xa2 (same human), tries to buy the other listing while that claim is live.
    // claimListing refuses it (same human already has a live claim), so there's no listing left
    // to even offer a price for.
    const attempt = await purchase(event, req("0xa2"), deps);
    expect(attempt.status).toBe(409);
    expect(attempt.body.error).toBe("sold_out");
    expect((await store.getTicket(listing2.id))?.status).toBe("listed"); // never claimed
  });
});

describe("resale per-person limit at the HTTP layer", () => {
  it("refuses to unlist a ticket back into existence over the owner's own limit elsewhere", async () => {
    const store = new MemoryStore();
    setStoreForTests(store);
    const event = makeEvent({ perPersonLimit: 1 });
    await store.createEvent(event);
    const listed: TicketRec = {
      id: "tkt_listed", eventId: event.id, nullifier: "777", agentId: "1", buyer: "0xa1", paidToken: "USDT",
      paidAmount: "1000000", paymentTx: "0xpayA", status: "listed", createdAt: new Date().toISOString(), settleStatus: "paid",
      listing: { seller: "0x9999999999999999999999999999999999999999", at: new Date().toISOString() },
    };
    await store.addTicket(listed, "holdA");
    const other: TicketRec = {
      id: "tkt_other", eventId: event.id, nullifier: "777", agentId: "1", buyer: "0xa2", paidToken: "USDT",
      paidAmount: "1000000", paymentTx: "0xpayB", status: "valid", createdAt: new Date().toISOString(), settleStatus: "paid",
    };
    await store.addTicket(other, "holdB");

    const app = buildApi(() => {});
    const res = await app.request(`/api/tickets/${listed.id}/unlist`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: ticketCode(listed.id) }),
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("per_person_limit");
    expect((await store.getTicket(listed.id))?.status).toBe("listed");
  });

  it("never hands the ticket's resale code to a caller who only has the ticket id", async () => {
    const store = new MemoryStore();
    setStoreForTests(store);
    const event = makeEvent();
    await store.createEvent(event);
    const t: TicketRec = {
      id: "tkt_public", eventId: event.id, nullifier: "777", agentId: "1", buyer: "0xa1", paidToken: "USDT",
      paidAmount: "1000000", paymentTx: "0xpayC", status: "valid", createdAt: new Date().toISOString(), settleStatus: "paid",
    };
    await store.addTicket(t, "holdC");

    const app = buildApi(() => {});
    const res = await app.request(`/api/tickets/${t.id}`);
    const body = await res.json();
    expect(body.id).toBe(t.id);
    expect(body.code).toBeUndefined();
  });
});

describe("pay by sending (MiniPay Send button)", () => {
  const BUYER = getAddress("0x3333333333333333333333333333333333333333");
  let store: MemoryStore;
  let event: EventRec;
  let sent: { tx: string; value: bigint }[];
  const deps = () => ({ store, rate: async () => RATE, settler: SETTLER, blockNumber: async () => 1000n, transfers: async () => sent });

  beforeEach(async () => {
    store = new MemoryStore();
    event = makeEvent({ humansOnly: false, minAge: 0, capacity: 2, perPersonLimit: 2 });
    await store.createEvent(event);
    sent = [];
  });

  it("holds a seat, waits for the transfer, then issues one ticket and queues the naira conversion", async () => {
    const o = await createSendOrder(event, BUYER, deps());
    expect(o.status).toBe(200);
    const amount = BigInt(o.body.amount as string);
    expect(amount % 10_000n).toBe(0n); // whole cents, easy to type in a wallet
    expect(await store.seatsTaken(event.id, Date.now())).toBe(1);

    const waiting = await checkSendOrder(o.body.order as string, deps());
    expect(waiting.status).toBe(202);

    sent = [{ tx: "0xsend1", value: amount }];
    const paid = await checkSendOrder(o.body.order as string, deps());
    expect(paid.status).toBe(200);
    expect(paid.toSettle?.paidToken).toBe("USDT");
    expect(parseTicketCode(ticketCode(paid.toSettle!.id))).toBe(paid.toSettle!.id);

    // Polling again returns the same ticket, never a second one.
    const again = await checkSendOrder(o.body.order as string, deps());
    expect(again.toSettle).toBeUndefined();
    expect((again.body.ticket as { id: string }).id).toBe(paid.toSettle!.id);
    expect((await store.listTickets(event.id)).length).toBe(1);
  });

  it("never uses one transfer for two orders", async () => {
    const a = await createSendOrder(event, BUYER, deps());
    const b = await createSendOrder(event, BUYER, deps());
    sent = [{ tx: "0xsend1", value: BigInt(a.body.amount as string) }];
    expect((await checkSendOrder(a.body.order as string, deps())).status).toBe(200);
    expect((await checkSendOrder(b.body.order as string, deps())).status).toBe(202);
  });

  it("ignores an underpayment and refuses tampered orders and verified-only events", async () => {
    const o = await createSendOrder(event, BUYER, deps());
    sent = [{ tx: "0xsmall", value: 100_000n }];
    expect((await checkSendOrder(o.body.order as string, deps())).status).toBe(202);
    expect((await checkSendOrder(String(o.body.order).replace(/.$/, "x"), deps())).status).toBe(400);
    const vip = makeEvent({ id: "evt_2", slug: "vip" });
    await store.createEvent(vip);
    expect((await createSendOrder(vip, BUYER, deps())).status).toBe(400);
  });
});

describe("fairness report on an open event", () => {
  it("counts different paying wallets when there is no Self check", async () => {
    const { fairnessReport } = await import("./report");
    const store = new MemoryStore();
    const event = makeEvent({ humansOnly: false, minAge: 0 });
    await store.createEvent(event);
    const base = { eventId: event.id, nullifier: "0", agentId: "0", paidToken: "USDT" as const, paidAmount: "1050000", status: "valid" as const, createdAt: new Date().toISOString(), settleStatus: "paid" as const };
    await store.addTicket({ ...base, id: "tkt_a", buyer: "0xAAA", paymentTx: "0x1" }, "h1");
    await store.addTicket({ ...base, id: "tkt_b", buyer: "0xaaa", paymentTx: "0x2" }, "h2");
    await store.addTicket({ ...base, id: "tkt_c", buyer: "0xBBB", paymentTx: "0x3" }, "h3");
    const r = await fairnessReport(event, store);
    expect(r.totals.countedBy).toBe("wallet");
    expect(r.totals.uniqueBuyers).toBe(2);
    expect(r.totals.maxTicketsOneBuyer).toBe(2);
  });
});

describe("friendly errors for fans", () => {
  it("never shows raw SDK or wallet errors", async () => {
    const { friendlyError } = await import("./client/friendly");
    expect(friendlyError(new Error("Registration did not complete within 900000ms. The session may still be active — call waitForCompletion() again"))).toMatch(/Self didn't confirm/);
    expect(friendlyError(new Error("User rejected the request."))).toMatch(/cancelled/);
    expect(friendlyError(new Error("TypeError: Failed to fetch"))).toMatch(/connection/);
    expect(friendlyError(new Error("execution reverted: ERC20: transfer amount exceeds balance"))).toMatch(/enough USD₮/);
    expect(friendlyError(new Error("Sold out."))).toBe("Sold out.");
  });
});

describe("agent purchases on buy", () => {
  it("cleans organizer handles from links and @", () => {
    expect(cleanHandle("@elysianhome")).toBe("elysianhome");
    expect(cleanHandle("https://www.instagram.com/elysian.home/?hl=en")).toBe("elysian.home");
    expect(cleanHandle("https://x.com/RaphElevator")).toBe("RaphElevator");
  });

  it("reads Instagram and X profiles whatever shape the provider returns", () => {
    const ig = readProfile("instagram", "a", { data: { user: { full_name: "Elysian Home", edge_followed_by: { count: 2300 }, is_verified: false } } });
    expect(ig).toMatchObject({ found: true, name: "Elysian Home", followers: 2300, verified: false });
    const x = readProfile("x", "b", { data: { legacy: { name: "Raph", followers_count: 512 }, is_blue_verified: true } });
    expect(x).toMatchObject({ found: true, followers: 512, verified: true });
    expect(readProfile("instagram", "c", { error: "user not found" }).found).toBe(false);
  });

  it("never pays naira to a payout wallet that failed sanctions screening", async () => {
    const store = new MemoryStore();
    const e = makeEvent({ payoutCheck: { address: ORGANIZER, sanctioned: true, paymentTx: null, priceUsd: "0.002", checkedAt: new Date().toISOString() } });
    await store.createEvent(e);
    const t = { id: "tkt_s", eventId: e.id, nullifier: "1", agentId: "1", buyer: "0xb", paidToken: "USDT" as const, paidAmount: "3000000", paymentTx: "0xpay", status: "valid" as const, settleStatus: "pending" as const, createdAt: new Date().toISOString() };
    await store.addTicket(t as never, "h_s");
    const chain = new Proxy({}, { get: () => () => { throw new Error("must not touch the chain"); } });
    const r = await settleTicket(t as never, { store, chain: chain as never });
    expect(r.settleStatus).toBe("failed");
  });
});
