"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { adminKeyFor } from "@/lib/client/admin";
import { celoscanTx, naira, short, usd } from "@/lib/format";

interface Admin {
  event: { title: string; slug: string; capacity: number; priceLabel: string; pageUrl: string; startsAt: string };
  payoutAddress: string;
  totals: { sold: number; checkedIn: number; ngnDeliveredLabel: string; pendingPayouts: number; blocked: number; blockedByReason: Record<string, number> };
  tickets: { id: string; createdAt: string; status: string; paidToken: string; paidAmount: string; paymentTx: string; settleStatus: string; payoutTx: string | null; ngnDelivered: string | null }[];
  recentBlocked: { reason: string; agent: string; at: string }[];
}

const REASONS: Record<string, string> = {
  unsigned: "No identity (bot or plain script)",
  not_verified: "Agent without a verified human",
  too_young: "Under the age limit",
  per_person_limit: "Same person, over the limit",
  error: "Failed check",
};

export default function Dashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<Admin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);

  const load = useCallback(async (k: string) => {
    const res = await fetch(`/api/events/${slug}/admin`, { headers: { "x-admin-key": k }, cache: "no-store" });
    if (res.status === 403) return setError("This private link isn't valid for this event.");
    if (!res.ok) return setError("Couldn't load your dashboard.");
    setData(await res.json());
  }, [slug]);

  useEffect(() => {
    const k = adminKeyFor(slug);
    setKey(k);
    if (!k) return setError("Open this page from your private dashboard link.");
    load(k);
    const t = setInterval(() => load(k), 8000);
    return () => clearInterval(t);
  }, [slug, load]);

  if (error) return <div className="wrap narrow section"><div className="notice notice-bad">{error}</div></div>;
  if (!data) return <div className="wrap section row"><span className="spinner" /> <span className="muted">Loading…</span></div>;

  const t = data.totals;
  return (
    <div className="wrap section stack">
      <div className="row between">
        <div>
          <div className="small muted">Organizer dashboard · updates live</div>
          <h2>{data.event.title}</h2>
        </div>
        <div className="row">
          <Link className="btn btn-sm" href={`/scan/${slug}#key=${key}`}>Open door scanner</Link>
          <Link className="btn btn-ghost btn-sm" href={`/e/${slug}`}>Event page</Link>
        </div>
      </div>

      <div className="grid grid-4">
        <div className="card"><div className="stat">{t.sold}<span className="faint small"> / {data.event.capacity}</span></div><div className="stat-label">Tickets sold</div></div>
        <div className="card"><div className="stat">{t.ngnDeliveredLabel}</div><div className="stat-label">Naira in your wallet{t.pendingPayouts ? ` · ${t.pendingPayouts} converting` : ""}</div></div>
        <div className="card"><div className="stat">{t.checkedIn}</div><div className="stat-label">Checked in at the door</div></div>
        <div className="card"><div className="stat" style={{ color: "var(--bad)" }}>{t.blocked}</div><div className="stat-label">Bots and scalpers blocked</div></div>
      </div>

      <div className="grid grid-2">
        <div className="card stack">
          <h3>Blocked attempts</h3>
          {t.blocked === 0 ? <p className="muted small">None yet. Anyone trying to buy without being a verified person, or over the limit, shows up here.</p> : (
            <div className="list">
              {Object.entries(t.blockedByReason).map(([r, n]) => (
                <div className="list-row" key={r}><span>{REASONS[r] ?? r}</span><b>{n}</b></div>
              ))}
            </div>
          )}
          {data.recentBlocked.length > 0 && (
            <div className="small faint">Latest: {REASONS[data.recentBlocked[0].reason] ?? data.recentBlocked[0].reason}, {short(data.recentBlocked[0].agent)}, {new Date(data.recentBlocked[0].at).toLocaleTimeString("en-NG")}</div>
          )}
        </div>
        <div className="card stack">
          <h3>Payout wallet</h3>
          <div className="mono small break">{data.payoutAddress}</div>
          <p className="small muted">Dollar payments are converted to cNGN on Textile FX and sent here automatically. cNGN payments come straight to you. Cash out to any Nigerian bank through cNGN partners like Busha or Quidax.</p>
          <a className="small" href={`https://celoscan.io/address/${data.payoutAddress}#tokentxns`} target="_blank" rel="noreferrer">See transfers on Celoscan ↗</a>
        </div>
      </div>

      <div className="card stack">
        <h3>Sales</h3>
        {data.tickets.length === 0 ? <p className="muted small">No sales yet. Share your event link: {data.event.pageUrl}</p> : (
          <div className="list">
            {[...data.tickets].reverse().map((x) => (
              <div className="list-row" key={x.id}>
                <span className="mono small">{x.id.slice(0, 12)}</span>
                <span className="small">{x.paidToken === "USDT" ? `${usd(x.paidAmount)} USD₮` : `${naira(x.paidAmount)} cNGN`}</span>
                <span className="small">
                  {x.settleStatus === "paid" || x.settleStatus === "direct" ? <span className="ok">{naira(x.ngnDelivered ?? "0")} received</span> : <span className="muted">{x.settleStatus}</span>}
                </span>
                <span className="small">{x.status === "used" ? "Checked in" : "Not yet in"}</span>
                <span className="small">
                  <a href={celoscanTx(x.paymentTx)} target="_blank" rel="noreferrer">payment ↗</a>
                  {x.payoutTx && <> · <a href={celoscanTx(x.payoutTx)} target="_blank" rel="noreferrer">payout ↗</a></>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
