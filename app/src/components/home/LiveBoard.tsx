"use client";

import Link from "next/link";
import { Arrow, Bot, Ticket } from "../icons";
import { ago, fmtNum, useLive } from "../live";
import { CountUp } from "../motion";

function Spark({ data, color = "var(--accent)" }: { data: number[]; color?: string }) {
  if (data.length < 2) {
    return (
      <svg className="spark" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden>
        <line x1="0" y1="35" x2="300" y2="35" stroke="var(--line-2)" strokeDasharray="4 6" />
      </svg>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 300, 62 - ((v - min) / span) * 54]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return (
    <svg className="spark" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient>
      </defs>
      <path d={`${d} L300 70 L0 70Z`} fill="url(#spk)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={color} />
    </svg>
  );
}

export default function LiveBoard() {
  const { stats, rate, rateHistory, chain, blockHistory } = useLive();
  const blockAge = chain ? Math.max(0, Math.round((Date.now() - Date.parse(chain.blockTime)) / 1000)) : null;

  return (
    <div className="hair hair-3">
      {/* rate */}
      <div>
        <div className="row between"><span className="eyebrow">USD₮ → naira</span><span className="pill pill-good"><span className="live-dot" style={{ width: 6, height: 6 }} /> Live</span></div>
        <div className="big-num" style={{ marginTop: 18 }}>{rate ? <>₦<CountUp value={rate} digits={2} /></> : "—"}</div>
        <p className="small faint" style={{ marginTop: 6 }}>Mid rate for 1 USD₮ from Textile FX. Updates every 30 seconds.</p>
        <Spark data={rateHistory} />
        <Link href="/how-it-works#naira" className="cell-title">Naira conversion <Arrow size={16} /></Link>
      </div>

      {/* chain */}
      <div>
        <div className="row between"><span className="eyebrow">Celo pulse</span><span className="mono small faint">{blockAge !== null ? `${blockAge}s ago` : ""}</span></div>
        <div style={{ marginTop: 18 }}>
          <div className="metric"><span>Latest block</span><b>{chain ? `#${Number(chain.block).toLocaleString("en-US")}` : "—"}</b></div>
          <div className="meter"><span style={{ width: chain ? `${(Number(chain.block) % 100) + 1}%` : "0%" }} /></div>
          <div className="metric"><span>Transactions in block</span><b>{chain ? chain.txCount : "—"}</b></div>
          <div className="meter"><span style={{ width: chain ? `${Math.min(100, chain.txCount * 2)}%` : "0%" }} /></div>
          <div className="metric"><span>Gas price</span><b>{chain ? `${chain.gasGwei} gwei` : "—"}</b></div>
          <div className="meter"><span style={{ width: chain ? `${Math.min(100, Number(chain.gasGwei) * 2)}%` : "0%" }} /></div>
        </div>
        <Spark data={blockHistory} color="var(--good)" />
        <a href={chain ? `https://celoscan.io/block/${chain.block}` : "https://celoscan.io"} target="_blank" rel="noreferrer" className="cell-title">See it on Celoscan <Arrow size={16} /></a>
      </div>

      {/* kovenra totals */}
      <div>
        <div className="row between"><span className="eyebrow">Kovenra so far</span><span className="mono small faint">{stats ? ago(stats.at) : ""}</span></div>
        <div className="kpis" style={{ marginTop: 18 }}>
          <div className="kpi"><b><CountUp value={stats?.ticketsSold} /></b><span>Tickets sold</span></div>
          <div className="kpi"><b>{stats ? stats.ngnPaidLabel : "—"}</b><span>Paid to organizers</span></div>
          <div className="kpi"><b className="gold"><CountUp value={stats?.botsBlocked} /></b><span>Bots turned away</span></div>
          <div className="kpi"><b><CountUp value={stats?.upcoming} /></b><span>Upcoming events</span></div>
        </div>
        <Link href="/proof" className="cell-title">Open the live record <Arrow size={16} /></Link>
      </div>

      {/* activity feed */}
      <div className="span-2">
        <div className="row between"><span className="eyebrow">Recent activity</span><span className="small faint">Sales and blocked bots, as they happen</span></div>
        <div className="feed" style={{ marginTop: 16 }}>
          {stats && stats.recent.length > 0 ? (
            stats.recent.map((r, i) => (
              <div className="feed-row" key={i}>
                {r.kind === "sale" ? <Ticket size={16} className="gold" /> : <Bot size={16} style={{ color: "var(--bad)" }} />}
                <span>{r.kind === "sale" ? "Ticket sold" : "Bot turned away"} · <span className="muted">{r.event}, {r.city}</span></span>
                <span className="t">{ago(r.at)}</span>
              </div>
            ))
          ) : (
            <div className="feed-row"><span className="muted">No activity yet. The first fair drop will show up here the second it happens.</span></div>
          )}
        </div>
      </div>

      {/* cities */}
      <div>
        <span className="eyebrow">Across Nigeria</span>
        <div className="big-num" style={{ marginTop: 18 }}><CountUp value={stats?.cities} /></div>
        <p className="small faint" style={{ marginTop: 6 }}>{stats && stats.cities === 1 ? "city" : "cities"} with events listed so far. Any city works: the price is in naira, not tied to one place.</p>
        <Link href="/events" className="cell-title">Browse events <Arrow size={16} /></Link>
        <p className="mono small faint" style={{ marginTop: 10 }}>{stats ? `${fmtNum(stats.events)} events listed in total` : ""}</p>
      </div>
    </div>
  );
}
