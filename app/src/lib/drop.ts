import { concat, createPublicClient, http, keccak256, toBytes, type Hex } from "viem";
import { celo } from "viem/chains";
import { env } from "./env";
import type { Entry, EventRec, Store } from "./store";

/**
 * Fair Drop: for shows that would sell out to bots in seconds.
 *
 *  1. While entries are open, each verified human enters once (all their agents share one entry).
 *  2. The draw uses the hash of the first Celo block at or after close + 60 seconds. Nobody,
 *     including Kovenra, can know that hash when entries close, and anyone can check it later.
 *  3. Each entry's place = keccak256(blockHash ‖ entryHash), lowest first. The first <capacity>
 *     entries win and get the claim window to pay. After that, remaining seats open to every entrant.
 */
export const DRAW_DELAY_MS = 60_000;

export type DropPhase = "entries" | "drawing" | "claim" | "open";

export function entryHash(eventId: string, nullifier: string): Hex {
  return keccak256(toBytes(`kovenra:${eventId}:${nullifier}`));
}

export function drawTarget(e: EventRec): number {
  return Date.parse(e.drop!.entryClosesAt) + DRAW_DELAY_MS;
}

export function phase(e: EventRec, now: number): DropPhase {
  const d = e.drop!;
  if (now < Date.parse(d.entryClosesAt)) return "entries";
  if (!d.drawSeed || !d.drawAt) return "drawing";
  if (now < Date.parse(d.drawAt) + d.claimMinutes * 60_000) return "claim";
  return "open";
}

/** Order entries by keccak256(seed ‖ entryHash). Pure: anyone can recompute it from public data. */
export function rank(entries: Pick<Entry, "entryHash">[], seed: Hex): string[] {
  return entries
    .map((x) => ({ h: x.entryHash, score: BigInt(keccak256(concat([seed, x.entryHash as Hex]))) }))
    .sort((a, b) => (a.score < b.score ? -1 : a.score > b.score ? 1 : 0))
    .map((x) => x.h);
}

export interface DrawResult {
  order: string[]; // entry hashes, best first
  winners: Set<string>;
}

export function drawResult(e: EventRec, entries: Entry[]): DrawResult | null {
  if (!e.drop?.drawSeed) return null;
  const order = rank(entries, e.drop.drawSeed as Hex);
  return { order, winners: new Set(order.slice(0, e.capacity)) };
}

/** Find the first block at or after `targetMs`. Celo makes a block about every second. */
export async function blockAtOrAfter(targetMs: number): Promise<{ number: bigint; hash: Hex; timestamp: number } | null> {
  const pub = createPublicClient({ chain: celo, transport: http(env.rpcUrl) });
  const latest = await pub.getBlock();
  const target = Math.ceil(targetMs / 1000);
  if (Number(latest.timestamp) < target) return null;
  let n = latest.number - BigInt(Number(latest.timestamp) - target);
  if (n < 0n) n = 0n;
  let b = await pub.getBlock({ blockNumber: n });
  // Step to the exact first block with timestamp >= target (blocks are ~1s, so this is a few steps at most).
  for (let i = 0; i < 60 && Number(b.timestamp) >= target && b.number > 0n; i++) {
    const prev = await pub.getBlock({ blockNumber: b.number - 1n });
    if (Number(prev.timestamp) < target) break;
    b = prev;
  }
  for (let i = 0; i < 60 && Number(b.timestamp) < target; i++) b = await pub.getBlock({ blockNumber: b.number + 1n });
  return { number: b.number, hash: b.hash, timestamp: Number(b.timestamp) };
}

/** Run the draw once, after the target block exists. Safe to call on every read. */
export async function ensureDraw(e: EventRec, store: Store, now = Date.now(), find = blockAtOrAfter): Promise<EventRec> {
  if (e.mode !== "fair-drop" || !e.drop || e.drop.drawSeed) return e;
  if (now < drawTarget(e) + 3_000) return e;
  const b = await find(drawTarget(e));
  if (!b) return e;
  const drop = { ...e.drop, drawBlock: b.number.toString(), drawSeed: b.hash, drawAt: new Date(b.timestamp * 1000).toISOString() };
  await store.updateEvent(e.id, { drop });
  return { ...e, drop };
}

export type DropCheck = { ok: true } | { ok: false; status: number; body: Record<string, unknown> };

/** May this human buy right now? Called by the ticket counter for fair-drop events. */
export async function dropCheck(e: EventRec, nullifier: string, store: Store, now: number): Promise<DropCheck> {
  const p = phase(e, now);
  if (p === "entries") {
    return { ok: false, status: 409, body: { error: "drop_entries_open", message: "This is a fair drop. Enter the draw now; winners are picked when entries close.", entryClosesAt: e.drop!.entryClosesAt } };
  }
  if (p === "drawing") {
    return { ok: false, status: 409, body: { error: "drop_drawing", message: "Entries are closed and the draw is running. Check back in a minute." } };
  }
  const h = entryHash(e.id, nullifier);
  const entries = await store.listEntries(e.id);
  if (!entries.some((x) => x.entryHash === h)) {
    return { ok: false, status: 403, body: { error: "drop_not_entered", message: "Only people who entered the fair drop can buy tickets for this event." } };
  }
  if (p === "claim") {
    const r = drawResult(e, entries)!;
    if (!r.winners.has(h)) {
      const place = r.order.indexOf(h) + 1;
      return { ok: false, status: 403, body: { error: "drop_not_won", message: `Not picked this time (you're #${place} of ${r.order.length}). If winners don't claim, seats open to everyone who entered when the claim window ends.`, place } };
    }
  }
  return { ok: true };
}
