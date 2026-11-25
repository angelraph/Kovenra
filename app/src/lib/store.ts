import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { env } from "./env";

export interface EventRec {
  id: string;
  slug: string;
  title: string;
  description: string;
  venue: string;
  city: string;
  startsAt: string; // ISO
  priceNgn: string; // cNGN base units (6 decimals)
  capacity: number;
  perPersonLimit: number;
  minAge: number; // 0 = no age check
  humansOnly: boolean; // require Self-verified human-backed buyers
  organizerName: string;
  payoutAddress: string;
  adminKeyHash: string;
  createdAt: string;
}

export type SettleStatus = "pending" | "converting" | "paid" | "direct" | "failed";

export interface TicketRec {
  id: string;
  eventId: string;
  nullifier: string; // Self human id ("0" when humansOnly is off)
  agentId: string;
  buyer: string;
  paidToken: "USDT" | "CNGN";
  paidAmount: string; // base units
  paymentTx: string;
  status: "valid" | "used";
  createdAt: string;
  checkedInAt?: string;
  settleStatus: SettleStatus;
  swapTx?: string;
  payoutTx?: string;
  ngnDelivered?: string;
  settleError?: string;
}

export interface Rejection {
  eventId: string;
  reason: string;
  agent: string;
  at: string;
}

export interface Store {
  createEvent(e: EventRec): Promise<void>;
  getEventBySlug(slug: string): Promise<EventRec | null>;
  getEvent(id: string): Promise<EventRec | null>;
  listEvents(limit?: number): Promise<EventRec[]>;
  /** Tickets sold + live holds for this event. */
  seatsTaken(eventId: string, now: number): Promise<number>;
  /** Tickets + live holds for this human at this event. */
  humanCount(eventId: string, nullifier: string, now: number): Promise<number>;
  /** Place or refresh a hold. Returns false if it would exceed capacity or the per-person limit. */
  hold(eventId: string, nullifier: string, holdKey: string, now: number, limits: { capacity: number; perPerson: number }): Promise<boolean>;
  releaseHold(holdKey: string): Promise<void>;
  addTicket(t: TicketRec, holdKey: string): Promise<void>;
  getTicket(id: string): Promise<TicketRec | null>;
  listTickets(eventId: string): Promise<TicketRec[]>;
  ticketByPaymentTx(tx: string): Promise<TicketRec | null>;
  updateTicket(id: string, patch: Partial<TicketRec>): Promise<void>;
  /** Atomically mark a valid ticket used. Returns the ticket if this call checked it in. */
  checkIn(id: string, at: string): Promise<TicketRec | null>;
  pendingSettlements(): Promise<TicketRec[]>;
  logRejection(r: Rejection): Promise<void>;
  rejections(eventId: string): Promise<Rejection[]>;
  allTickets(limit?: number): Promise<TicketRec[]>;
}

export const HOLD_MS = 5 * 60 * 1000;

interface Hold {
  key: string;
  eventId: string;
  nullifier: string;
  at: number;
}

interface MemData {
  events: EventRec[];
  tickets: TicketRec[];
  holds: Hold[];
  rejections: Rejection[];
}

/** In-memory store, optionally persisted to a JSON file for local development. */
export class MemoryStore implements Store {
  private d: MemData = { events: [], tickets: [], holds: [], rejections: [] };
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private file?: string) {
    if (file && fs.existsSync(file)) this.d = JSON.parse(fs.readFileSync(file, "utf8"));
  }

  private save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.d, null, 2));
  }

  /** Serialize mutations so concurrent requests can't both pass a limit check. */
  private lock<T>(fn: () => T): Promise<T> {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private liveHolds(eventId: string, now: number) {
    return this.d.holds.filter((h) => h.eventId === eventId && now - h.at < HOLD_MS);
  }

  async createEvent(e: EventRec) {
    await this.lock(() => {
      if (this.d.events.some((x) => x.slug === e.slug)) throw new Error("slug_taken");
      this.d.events.push(e);
      this.save();
    });
  }
  async getEventBySlug(slug: string) {
    return this.d.events.find((e) => e.slug === slug) ?? null;
  }
  async getEvent(id: string) {
    return this.d.events.find((e) => e.id === id) ?? null;
  }
  async listEvents(limit = 50) {
    return [...this.d.events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, limit);
  }
  async seatsTaken(eventId: string, now: number) {
    return this.d.tickets.filter((t) => t.eventId === eventId).length + this.liveHolds(eventId, now).length;
  }
  async humanCount(eventId: string, nullifier: string, now: number) {
    return (
      this.d.tickets.filter((t) => t.eventId === eventId && t.nullifier === nullifier).length +
      this.liveHolds(eventId, now).filter((h) => h.nullifier === nullifier).length
    );
  }
  async hold(eventId: string, nullifier: string, key: string, now: number, limits: { capacity: number; perPerson: number }) {
    return this.lock(() => {
      this.d.holds = this.d.holds.filter((h) => now - h.at < HOLD_MS);
      const existing = this.d.holds.find((h) => h.key === key);
      if (existing) {
        existing.at = now;
        this.save();
        return true;
      }
      const seats = this.d.tickets.filter((t) => t.eventId === eventId).length + this.liveHolds(eventId, now).length;
      if (seats >= limits.capacity) return false;
      if (nullifier !== "0") {
        const mine =
          this.d.tickets.filter((t) => t.eventId === eventId && t.nullifier === nullifier).length +
          this.liveHolds(eventId, now).filter((h) => h.nullifier === nullifier).length;
        if (mine >= limits.perPerson) return false;
      }
      this.d.holds.push({ key, eventId, nullifier, at: now });
      this.save();
      return true;
    });
  }
  async releaseHold(key: string) {
    await this.lock(() => {
      this.d.holds = this.d.holds.filter((h) => h.key !== key);
      this.save();
    });
  }
  async addTicket(t: TicketRec, holdKey: string) {
    await this.lock(() => {
      if (this.d.tickets.some((x) => x.paymentTx === t.paymentTx && t.paymentTx)) throw new Error("duplicate_payment");
      this.d.holds = this.d.holds.filter((h) => h.key !== holdKey);
      this.d.tickets.push(t);
      this.save();
    });
  }
  async getTicket(id: string) {
    return this.d.tickets.find((t) => t.id === id) ?? null;
  }
  async listTickets(eventId: string) {
    return this.d.tickets.filter((t) => t.eventId === eventId);
  }
  async ticketByPaymentTx(tx: string) {
    return this.d.tickets.find((t) => t.paymentTx === tx) ?? null;
  }
  async updateTicket(id: string, patch: Partial<TicketRec>) {
    await this.lock(() => {
      const t = this.d.tickets.find((x) => x.id === id);
      if (t) Object.assign(t, patch);
      this.save();
    });
  }
  async checkIn(id: string, at: string) {
    return this.lock(() => {
      const t = this.d.tickets.find((x) => x.id === id);
      if (!t || t.status !== "valid") return null;
      t.status = "used";
      t.checkedInAt = at;
      this.save();
      return { ...t };
    });
  }
  async pendingSettlements() {
    return this.d.tickets.filter((t) => t.settleStatus === "pending" || t.settleStatus === "failed");
  }
  async logRejection(r: Rejection) {
    await this.lock(() => {
      this.d.rejections.push(r);
      if (this.d.rejections.length > 5000) this.d.rejections.shift();
      this.save();
    });
  }
  async rejections(eventId: string) {
    return this.d.rejections.filter((r) => r.eventId === eventId);
  }
  async allTickets(limit = 200) {
    return [...this.d.tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }
}

/** Postgres store for production (Neon / Vercel Postgres). */
export class PgStore implements Store {
  private sql: postgres.Sql;
  private ready: Promise<void>;

  constructor(url: string) {
    this.sql = postgres(url, { ssl: "require", max: 3, idle_timeout: 20 });
    this.ready = this.migrate();
  }

  private async migrate() {
    const s = this.sql;
    await s`create table if not exists events (
      id text primary key, slug text unique not null, data jsonb not null, starts_at text not null)`;
    await s`create table if not exists tickets (
      id text primary key, event_id text not null, nullifier text not null, payment_tx text,
      settle_status text not null, created_at text not null, data jsonb not null)`;
    await s`create unique index if not exists tickets_payment_tx on tickets(payment_tx) where payment_tx <> ''`;
    await s`create index if not exists tickets_event on tickets(event_id)`;
    await s`create table if not exists holds (
      key text primary key, event_id text not null, nullifier text not null, at bigint not null)`;
    await s`create table if not exists rejections (
      id bigserial primary key, event_id text not null, data jsonb not null)`;
  }

  private async q() {
    await this.ready;
    return this.sql;
  }

  async createEvent(e: EventRec) {
    const s = await this.q();
    await s`insert into events (id, slug, data, starts_at) values (${e.id}, ${e.slug}, ${s.json(e as never)}, ${e.startsAt})`;
  }
  async getEventBySlug(slug: string) {
    const s = await this.q();
    const r = await s`select data from events where slug = ${slug}`;
    return (r[0]?.data as EventRec) ?? null;
  }
  async getEvent(id: string) {
    const s = await this.q();
    const r = await s`select data from events where id = ${id}`;
    return (r[0]?.data as EventRec) ?? null;
  }
  async listEvents(limit = 50) {
    const s = await this.q();
    const r = await s`select data from events order by starts_at asc limit ${limit}`;
    return r.map((x) => x.data as EventRec);
  }
  async seatsTaken(eventId: string, now: number) {
    const s = await this.q();
    const r = await s`select
      (select count(*) from tickets where event_id = ${eventId}) +
      (select count(*) from holds where event_id = ${eventId} and at > ${now - HOLD_MS}) as n`;
    return Number(r[0].n);
  }
  async humanCount(eventId: string, nullifier: string, now: number) {
    const s = await this.q();
    const r = await s`select
      (select count(*) from tickets where event_id = ${eventId} and nullifier = ${nullifier}) +
      (select count(*) from holds where event_id = ${eventId} and nullifier = ${nullifier} and at > ${now - HOLD_MS}) as n`;
    return Number(r[0].n);
  }
  async hold(eventId: string, nullifier: string, key: string, now: number, limits: { capacity: number; perPerson: number }) {
    const s = await this.q();
    return s.begin(async (tx) => {
      // Serialize holds per event so two buyers can't both take the last seat.
      await tx`select pg_advisory_xact_lock(hashtext(${eventId}))`;
      await tx`delete from holds where at <= ${now - HOLD_MS}`;
      const ex = await tx`update holds set at = ${now} where key = ${key} returning key`;
      if (ex.length) return true;
      const seats = await tx`select
        (select count(*) from tickets where event_id = ${eventId}) +
        (select count(*) from holds where event_id = ${eventId}) as n`;
      if (Number(seats[0].n) >= limits.capacity) return false;
      if (nullifier !== "0") {
        const mine = await tx`select
          (select count(*) from tickets where event_id = ${eventId} and nullifier = ${nullifier}) +
          (select count(*) from holds where event_id = ${eventId} and nullifier = ${nullifier}) as n`;
        if (Number(mine[0].n) >= limits.perPerson) return false;
      }
      await tx`insert into holds (key, event_id, nullifier, at) values (${key}, ${eventId}, ${nullifier}, ${now})`;
      return true;
    }) as Promise<boolean>;
  }
  async releaseHold(key: string) {
    const s = await this.q();
    await s`delete from holds where key = ${key}`;
  }
  async addTicket(t: TicketRec, holdKey: string) {
    const s = await this.q();
    await s.begin(async (tx) => {
      await tx`insert into tickets (id, event_id, nullifier, payment_tx, settle_status, created_at, data)
        values (${t.id}, ${t.eventId}, ${t.nullifier}, ${t.paymentTx}, ${t.settleStatus}, ${t.createdAt}, ${tx.json(t as never)})`;
      await tx`delete from holds where key = ${holdKey}`;
    });
  }
  async getTicket(id: string) {
    const s = await this.q();
    const r = await s`select data from tickets where id = ${id}`;
    return (r[0]?.data as TicketRec) ?? null;
  }
  async listTickets(eventId: string) {
    const s = await this.q();
    const r = await s`select data from tickets where event_id = ${eventId} order by created_at`;
    return r.map((x) => x.data as TicketRec);
  }
  async ticketByPaymentTx(tx: string) {
    const s = await this.q();
    const r = await s`select data from tickets where payment_tx = ${tx}`;
    return (r[0]?.data as TicketRec) ?? null;
  }
  async updateTicket(id: string, patch: Partial<TicketRec>) {
    const s = await this.q();
    await s`update tickets set data = data || ${s.json(patch as never)},
      settle_status = coalesce(${patch.settleStatus ?? null}, settle_status) where id = ${id}`;
  }
  async checkIn(id: string, at: string) {
    const s = await this.q();
    const r = await s`update tickets set data = data || ${s.json({ status: "used", checkedInAt: at } as never)}
      where id = ${id} and data->>'status' = 'valid' returning data`;
    return (r[0]?.data as TicketRec) ?? null;
  }
  async pendingSettlements() {
    const s = await this.q();
    const r = await s`select data from tickets where settle_status in ('pending','failed') order by created_at limit 50`;
    return r.map((x) => x.data as TicketRec);
  }
  async logRejection(r: Rejection) {
    const s = await this.q();
    await s`insert into rejections (event_id, data) values (${r.eventId}, ${s.json(r as never)})`;
  }
  async rejections(eventId: string) {
    const s = await this.q();
    const r = await s`select data from rejections where event_id = ${eventId} order by id desc limit 500`;
    return r.map((x) => x.data as Rejection);
  }
  async allTickets(limit = 200) {
    const s = await this.q();
    const r = await s`select data from tickets order by created_at desc limit ${limit}`;
    return r.map((x) => x.data as TicketRec);
  }
}

let singleton: Store | null = null;
export function getStore(): Store {
  if (!singleton) {
    singleton = env.databaseUrl
      ? new PgStore(env.databaseUrl)
      : new MemoryStore(path.join(process.cwd(), ".data", "kovenra.json"));
  }
  return singleton;
}
export function setStoreForTests(s: Store) {
  singleton = s;
}
