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
import { MemoryStore, type EventRec } from "./store";
import type { FirmQuote } from "./textile";
import { usdtForNaira } from "./textile";
import { hashKey, parseTicketCode, ticketCode } from "./tickets";

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