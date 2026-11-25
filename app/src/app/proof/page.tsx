import { celoscanTx, naira, usd } from "@/lib/format";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = { title: "On-chain proof · Kovenra" };

export default async function Proof() {
  let rows: Awaited<ReturnType<ReturnType<typeof getStore>["allTickets"]>> = [];
  const titles = new Map<string, string>();
  try {
    const store = getStore();
    rows = await store.allTickets(300);
    for (const t of rows) if (!titles.has(t.eventId)) titles.set(t.eventId, (await store.getEvent(t.eventId))?.title ?? "");
  } catch {}
  const ngn = rows.reduce((s, t) => s + BigInt(t.ngnDelivered ?? "0"), 0n);

  return (
    <div className="wrap section stack">
      <h2>On-chain proof</h2>
      <p className="muted" style={{ maxWidth: 700 }}>
        Every ticket sold on Kovenra is a real payment on Celo mainnet. USD₮ payments are converted to naira on Textile FX and paid to
        the organizer. Every Kovenra transaction carries our ERC-8021 attribution tag, so you can check each one on Celoscan.
        Buyers&apos; identities are never shown; only a yes or no from Self is used.
      </p>
      <div className="grid grid-3">
        <div className="card"><div className="stat">{rows.length}</div><div className="stat-label">Tickets sold</div></div>
        <div className="card"><div className="stat">{naira(ngn)}</div><div className="stat-label">Paid to organizers in naira</div></div>
        <div className="card"><div className="stat">{titles.size}</div><div className="stat-label">Events with sales</div></div>
      </div>
      <div className="list">
        {rows.length === 0 && <div className="list-row muted">No sales yet.</div>}
        {rows.map((t) => (
          <div className="list-row" key={t.id}>
            <span>{titles.get(t.eventId)}</span>
            <span className="small muted">{new Date(t.createdAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</span>
            <span className="small">{t.paidToken === "USDT" ? `${usd(t.paidAmount)} USD₮` : `${naira(t.paidAmount)} cNGN`}</span>
            <span className="small">
              <a href={celoscanTx(t.paymentTx)} target="_blank" rel="noreferrer">x402 payment ↗</a>
              {t.swapTx && <> · <a href={celoscanTx(t.swapTx)} target="_blank" rel="noreferrer">Textile FX ↗</a></>}
              {t.payoutTx && <> · <a href={celoscanTx(t.payoutTx)} target="_blank" rel="noreferrer">naira payout ↗</a></>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
