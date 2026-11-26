import { createPublicClient, formatGwei, http } from "viem";
import { celo } from "viem/chains";
import { formatNaira } from "./chain";
import { env } from "./env";
import { countsAsSeat, getStore } from "./store";

/** Live, real numbers only. Nothing here is simulated. */
export type LiveStats = {
  events: number;
  upcoming: number;
  ticketsSold: number;
  checkedIn: number;
  botsBlocked: number;
  ngnPaid: string;
  ngnPaidLabel: string;
  cities: number;
  recent: { kind: "sale" | "resale" | "blocked"; event: string; city: string; at: string; reason?: string }[];
  at: string;
};

let cache: { at: number; data: LiveStats } | null = null;

export async function liveStats(): Promise<LiveStats> {
  if (cache && Date.now() - cache.at < 10_000) return cache.data;
  const store = getStore();
  const events = await store.listEvents(500);
  const now = Date.now();
  let ticketsSold = 0;
  let checkedIn = 0;
  let botsBlocked = 0;
  let ngn = 0n;
  const recent: LiveStats["recent"] = [];
  for (const e of events) {
    const [all, rejections] = await Promise.all([store.listTickets(e.id), store.rejections(e.id)]);
    const tickets = all.filter(countsAsSeat);
    ticketsSold += tickets.length;
    checkedIn += tickets.filter((t) => t.status === "used").length;
    botsBlocked += rejections.length;
    for (const t of tickets) {
      if (!t.resale) ngn += BigInt(t.ngnDelivered ?? (t.paidToken === "CNGN" ? t.paidAmount : "0"));
      recent.push({ kind: t.resale ? "resale" : "sale", event: e.title, city: e.city, at: t.createdAt });
    }
    for (const r of rejections) recent.push({ kind: "blocked", event: e.title, city: e.city, at: r.at, reason: r.reason });
  }
  recent.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const data: LiveStats = {
    events: events.length,
    upcoming: events.filter((e) => Date.parse(e.startsAt) > now).length,
    ticketsSold,
    checkedIn,
    botsBlocked,
    ngnPaid: ngn.toString(),
    ngnPaidLabel: formatNaira(ngn),
    cities: new Set(events.map((e) => e.city.trim().toLowerCase())).size,
    recent: recent.slice(0, 12),
    at: new Date().toISOString(),
  };
  cache = { at: Date.now(), data };
  return data;
}

const client = createPublicClient({ chain: celo, transport: http(env.rpcUrl) });

export async function chainPulse() {
  const [block, gas] = await Promise.all([client.getBlock(), client.getGasPrice()]);
  return {
    chainId: 42220,
    block: block.number.toString(),
    blockTime: new Date(Number(block.timestamp) * 1000).toISOString(),
    txCount: block.transactions.length,
    gasGwei: Number(formatGwei(gas)).toFixed(1),
  };
}
