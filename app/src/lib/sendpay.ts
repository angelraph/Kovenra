import crypto from "node:crypto";
import { createPublicClient, getAddress, http, isAddress, parseAbiItem, type Address } from "viem";
import { celo } from "viem/chains";
import { TOKENS } from "./chain";
import { env, settlerAddressFromEnv } from "./env";
import { liveRate, priceFor } from "./purchase";
import type { EventRec, Store, TicketRec } from "./store";
import { hashKey, newId } from "./tickets";

/**
 * "Pay by sending": for buyers whose wallet can't open web pages (MiniPay only
 * opens listed apps), they send USD₮ with their wallet's normal Send button.
 *
 * 1. The buyer tells us the wallet they'll pay from. We hold a seat and return
 *    a signed order: amount, pay-to address, the block we start watching from.
 * 2. The page polls. We look for a USD₮ transfer from that wallet to Kovenra's
 *    wallet after that block. The first unused one becomes the ticket.
 * 3. The USD₮ is converted to cNGN for the organizer like any other sale.
 *
 * One ticket per transaction: the ticket id comes from the tx hash and the
 * store refuses a second ticket for the same payment.
 */

export interface Transfer {
  tx: string;
  value: bigint;
}

export interface SendDeps {
  store: Store;
  now?: () => number;
  rate?: () => Promise<string>;
  settler?: Address;
  blockNumber?: () => Promise<bigint>;
  /** USD₮ transfers from `from` to `to` at or after `fromBlock`, oldest first. */
  transfers?: (from: Address, to: Address, fromBlock: bigint) => Promise<Transfer[]>;
}

/** How long a buyer has to send, and how long we keep looking for a late payment. */
export const ORDER_MS = 30 * 60_000;
const LOOK_MS = 3 * 3600_000;

interface Order {
  o: string; // order id
  e: string; // event id
  f: Address; // payer wallet
  t: Address; // pay to
  a: string; // amount, USD₮ base units
  b: string; // start block
  c: number; // created at
}

export const canSendPay = (e: EventRec) => !e.humansOnly && e.mode !== "fair-drop";

function sign(body: string) {
  return crypto.createHmac("sha256", env.ticketSecret).update(`send:${body}`).digest("base64url").slice(0, 22);
}

export function encodeOrder(o: Order): string {
  const body = Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeOrder(token: string): Order | null {
  const [body, mac] = String(token ?? "").split(".");
  if (!body || !mac || sign(body) !== mac) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as Order;
  } catch {
    return null;
  }
}

const holdKey = (orderId: string) => hashKey(`send:${orderId}`);
/** The ticket id is fixed by the payment, so the same transfer can never make two tickets. */
const ticketIdFor = (tx: string) => `tkt_${crypto.createHash("sha256").update(tx.toLowerCase()).digest("base64url").slice(0, 16)}`;
/** Wallets let people type cents, so round the price up to the next cent. */
const roundUpCents = (units: bigint) => ((units + 9_999n) / 10_000n) * 10_000n;

function makeClient() {
  return createPublicClient({ chain: celo, transport: http(env.rpcUrl) });
}
let pub: ReturnType<typeof makeClient> | null = null;
const client = () => (pub ??= makeClient());

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

/** Forno caps log queries at 5,000 blocks, so read in chunks. */
export async function liveTransfers(from: Address, to: Address, fromBlock: bigint): Promise<Transfer[]> {
  const c = client();
  const latest = await c.getBlockNumber();
  const out: Transfer[] = [];
  for (let start = fromBlock; start <= latest; start += 5000n) {
    const end = start + 4999n > latest ? latest : start + 4999n;
    const logs = await c.getLogs({ address: TOKENS.USDT.address, event: TRANSFER, args: { from, to }, fromBlock: start, toBlock: end });
    for (const l of logs) out.push({ tx: l.transactionHash, value: l.args.value ?? 0n });
  }
  return out;
}

type Result = { status: number; body: Record<string, unknown>; toSettle?: TicketRec };

export async function createSendOrder(event: EventRec, fromRaw: string, deps: SendDeps): Promise<Result> {
  const now = deps.now?.() ?? Date.now();
  if (!canSendPay(event)) return { status: 400, body: { error: "not_available", message: "This event sells only to verified people, so it needs the in-app checkout." } };
  if (new Date(event.startsAt).getTime() + 6 * 3600_000 < now) return { status: 410, body: { error: "event_over", message: "This event has ended." } };
  if (!isAddress(String(fromRaw ?? "").trim())) return { status: 400, body: { error: "invalid_wallet", message: "That doesn't look like a wallet address. It starts with 0x and is 42 characters long." } };
  const from = getAddress(String(fromRaw).trim());
  const settler = deps.settler ?? settlerAddressFromEnv();
  if (!settler) return { status: 503, body: { error: "not_configured", message: "Ticket sales are not switched on yet." } };
  if (from.toLowerCase() === settler.toLowerCase()) return { status: 400, body: { error: "invalid_wallet", message: "Use your own wallet address." } };

  const orderId = newId("ord");
  const held = await deps.store.hold(event.id, "0", holdKey(orderId), now, { capacity: event.capacity, perPerson: event.perPersonLimit });
  if (!held) return { status: 409, body: { error: "sold_out", message: "Sold out." } };

  const price = await priceFor(event, await (deps.rate ?? liveRate)());
  const amount = roundUpCents(price.usdt);
  const block = await (deps.blockNumber ?? (() => client().getBlockNumber()))();
  // Start a little earlier so a payment sent while this request was in flight still counts.
  const start = block > 30n ? block - 30n : 0n;
  const order: Order = { o: orderId, e: event.id, f: from, t: settler, a: amount.toString(), b: start.toString(), c: now };
  return {
    status: 200,
    body: {
      order: encodeOrder(order),
      payTo: settler,
      from,
      amount: amount.toString(),
      amountLabel: (Number(amount) / 1e6).toFixed(2),
      token: "USD₮",
      expiresAt: new Date(now + ORDER_MS).toISOString(),
    },
  };
}

export async function checkSendOrder(token: string, deps: SendDeps): Promise<Result> {
  const now = deps.now?.() ?? Date.now();
  const o = decodeOrder(token);
  if (!o) return { status: 400, body: { error: "bad_order", message: "This payment link is broken. Start again." } };
  if (now - o.c > LOOK_MS) return { status: 410, body: { error: "order_expired", message: "This order is too old. If you paid, contact the organizer with your wallet address." } };
  const event = await deps.store.getEvent(o.e);
  if (!event) return { status: 404, body: { error: "not_found" } };

  const find = deps.transfers ?? liveTransfers;
  const min = (BigInt(o.a) * 99n) / 100n;
  for (const t of await find(o.f, o.t, BigInt(o.b))) {
    if (t.value < min) continue;
    const existing = await deps.store.ticketByPaymentTx(t.tx);
    if (existing) {
      if (existing.sendOrder === o.o) return paidBody(existing);
      continue; // this transfer already paid for another ticket
    }
    const ticket: TicketRec = {
      id: ticketIdFor(t.tx),
      eventId: event.id,
      nullifier: "0",
      agentId: "0",
      buyer: o.f,
      paidToken: "USDT",
      paidAmount: t.value.toString(),
      paymentTx: t.tx,
      status: "valid",
      createdAt: new Date(now).toISOString(),
      settleStatus: "pending",
      sendOrder: o.o,
    };
    try {
      await deps.store.addTicket(ticket, holdKey(o.o));
    } catch {
      // Another poll of this same order won the race; return what it wrote.
      const again = await deps.store.ticketByPaymentTx(t.tx);
      if (again?.sendOrder === o.o) return paidBody(again);
      continue;
    }
    return { ...paidBody(ticket), toSettle: ticket };
  }

  // Not paid yet: keep the seat while the buyer has the page open.
  if (now - o.c < ORDER_MS) {
    const held = await deps.store.hold(event.id, "0", holdKey(o.o), now, { capacity: event.capacity, perPerson: event.perPersonLimit });
    if (!held) return { status: 409, body: { error: "sold_out", message: "Sorry, the last seat just went. Don't send anything." } };
  }
  return { status: 202, body: { paid: false, expiresAt: new Date(o.c + ORDER_MS).toISOString() } };
}

function paidBody(t: TicketRec): Result {
  return { status: 200, body: { paid: true, ticket: { id: t.id, url: `${env.baseUrl}/t/${t.id}`, tx: t.paymentTx } } };
}
