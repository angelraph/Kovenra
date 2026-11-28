import crypto from "node:crypto";
import { env } from "./env";
import type { EventRec } from "./store";

export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(9).toString("base64url")}`;

export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function newAdminKey(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function checkAdmin(event: EventRec, key: string | undefined | null): boolean {
  if (!key) return false;
  const a = Buffer.from(hashKey(key), "hex");
  const b = Buffer.from(event.adminKeyHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** QR payload: "kv1.<ticketId>.<mac>". The MAC stops anyone forging a ticket from an id. */
export function ticketCode(ticketId: string): string {
  const mac = crypto.createHmac("sha256", env.ticketSecret).update(ticketId).digest("base64url").slice(0, 16);
  return `kv1.${ticketId}.${mac}`;
}

export function parseTicketCode(code: string): string | null {
  const trimmed = code.trim();
  const m = /^kv1\.(tkt_[A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{16})$/.exec(trimmed);
  if (!m) return null;
  const expected = Buffer.from(ticketCode(m[1]));
  const actual = Buffer.from(trimmed);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual) ? m[1] : null;
}

/** Constant-time comparison for secrets read from a request header. */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "event"}-${crypto.randomBytes(3).toString("hex")}`;
}

/** The hold key ties the unpaid 402 request and the paid retry to one seat. */
export function holdKeyFor(eventId: string, nullifier: string, agent: string): string {
  return hashKey(`${eventId}:${nullifier}:${agent.toLowerCase()}`);
}
