import { formatNaira } from "./chain";
import { drawResult, phase } from "./drop";
import { countsAsSeat, type EventRec, type Store } from "./store";

const REASON_LABEL: Record<string, string> = {
  unsigned: "No Self Agent ID",
  not_verified: "Not a verified human",
  too_young: "Under the age limit",
  per_person_limit: "Tried to go over the per-person limit",
  error: "Invalid or expired signature",
};

/**
 * The fairness report for one event: who got tickets (anonymously), who was turned away and why,
 * how resales happened, and the fair-drop draw with everything needed to check it.
 */
export async function fairnessReport(e: EventRec, store: Store, now = Date.now()) {
  const [tickets, rejections, entries] = await Promise.all([store.listTickets(e.id), store.rejections(e.id), store.listEntries(e.id)]);
  const seats = tickets.filter(countsAsSeat);
  // Verified-humans events count per Self nullifier (one person, all their agents).
  // Open events have no person id, so count per paying wallet instead.
  const perHuman = new Map<string, number>();
  for (const t of seats) if (t.status !== "listed" && t.nullifier !== "0") perHuman.set(t.nullifier, (perHuman.get(t.nullifier) ?? 0) + 1);
  const perWallet = new Map<string, number>();
  for (const t of seats) if (t.buyer && !t.buyer.startsWith("anon:")) perWallet.set(t.buyer.toLowerCase(), (perWallet.get(t.buyer.toLowerCase()) ?? 0) + 1);
  const byHuman = e.humansOnly || perHuman.size > 0;
  const byReason: Record<string, number> = {};
  for (const r of rejections) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
  const resales = tickets.filter((t) => t.resale);
  const ngnPaid = seats.reduce((s, t) => s + (t.resale ? 0n : BigInt(t.ngnDelivered ?? (t.paidToken === "CNGN" ? t.paidAmount : "0"))), 0n);

  const draw = e.mode === "fair-drop" && e.drop ? drawResult(e, entries) : null;
  const winnersWhoBought = draw ? seats.filter((t) => draw.winners.has(entryHashOf(e.id, t.nullifier, entries))).length : 0;

  return {
    event: { slug: e.slug, title: e.title, city: e.city, venue: e.venue, startsAt: e.startsAt, capacity: e.capacity, perPersonLimit: e.perPersonLimit, humansOnly: e.humansOnly, priceLabel: formatNaira(BigInt(e.priceNgn)), mode: e.mode ?? "first-come" },
    totals: {
      ticketsSold: seats.length,
      uniqueHumans: perHuman.size,
      maxTicketsOneHuman: Math.max(0, ...perHuman.values()),
      uniqueWallets: perWallet.size,
      maxTicketsOneWallet: Math.max(0, ...perWallet.values()),
      /** What the two numbers below count: verified people, or paying wallets on an open event. */
      countedBy: (byHuman ? "human" : "wallet") as "human" | "wallet",
      uniqueBuyers: byHuman ? perHuman.size : perWallet.size,
      maxTicketsOneBuyer: byHuman ? Math.max(0, ...perHuman.values()) : Math.max(0, ...perWallet.values()),
      checkedIn: seats.filter((t) => t.status === "used").length,
      botsBlocked: rejections.length,
      ngnPaidToOrganizer: ngnPaid.toString(),
      ngnPaidLabel: formatNaira(ngnPaid),
      resales: resales.length,
      resalesAboveFaceValue: 0,
      listedNow: tickets.filter((t) => t.status === "listed").length,
    },
    blocked: Object.entries(byReason).map(([reason, count]) => ({ reason, label: REASON_LABEL[reason] ?? reason, count })).sort((a, b) => b.count - a.count),
    drop:
      e.mode === "fair-drop" && e.drop
        ? {
            phase: phase(e, now),
            entryClosesAt: e.drop.entryClosesAt,
            claimMinutes: e.drop.claimMinutes,
            entries: entries.length,
            winners: draw ? Math.min(e.capacity, entries.length) : 0,
            winnersWhoBought,
            drawBlock: e.drop.drawBlock ?? null,
            drawSeed: e.drop.drawSeed ?? null,
            drawAt: e.drop.drawAt ?? null,
            order: draw ? draw.order.map((h, i) => ({ place: i + 1, entry: h, winner: draw.winners.has(h) })) : [],
            method: "place = keccak256(blockHash ‖ entryHash), lowest first; entryHash = keccak256(\"kovenra:<eventId>:<Self nullifier>\"); block = first Celo block at or after entries close + 60s",
          }
        : null,
    transactions: seats
      .filter((t) => t.paymentTx)
      .map((t) => ({ at: t.createdAt, token: t.paidToken, amount: t.paidAmount, payment: t.paymentTx, conversion: t.swapTx ?? null, payout: t.payoutTx ?? null, resale: Boolean(t.resale) })),
    generatedAt: new Date(now).toISOString(),
  };
}

function entryHashOf(eventId: string, nullifier: string, entries: { nullifier: string; entryHash: string }[]) {
  return entries.find((x) => x.nullifier === nullifier)?.entryHash ?? `none:${eventId}`;
}

export type FairnessReport = Awaited<ReturnType<typeof fairnessReport>>;
