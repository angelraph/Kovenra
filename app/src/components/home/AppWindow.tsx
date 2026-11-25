"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Mark } from "../brand";
import { Calendar, Chart, Qr, Scan, Shield, Ticket, Wallet } from "../icons";
import { fmtNum, useLive } from "../live";

/** An example organizer dashboard (clearly labelled as an example), animated like a live session. */
const ROWS = [
  { who: "Verified human", tok: "USD₮", amt: "₦3,000", st: "Paid", ok: true },
  { who: "Agent · verified", tok: "cNGN", amt: "₦3,000", st: "Paid", ok: true },
  { who: "Unverified bot", tok: "—", amt: "—", st: "Blocked", ok: false },
  { who: "Verified human", tok: "USD₮", amt: "₦3,000", st: "Checked in", ok: true },
  { who: "Same person, 2nd agent", tok: "—", amt: "—", st: "Limit", ok: false },
];

export default function AppWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px" });
  const { rate } = useLive();
  const [sold, setSold] = useState(212);
  const [blocked, setBlocked] = useState(1384);
  const [shown, setShown] = useState(2);

  useEffect(() => {
    if (!inView) return;
    const iv = setInterval(() => {
      setSold((s) => (s < 300 ? s + 1 : 212));
      setBlocked((b) => b + 3);
      setShown((n) => (n >= ROWS.length ? 2 : n + 1));
    }, 1400);
    return () => clearInterval(iv);
  }, [inView]);

  return (
    <div className="texture" ref={ref}>
      <div className="window">
        <div className="window-bar">
          <div className="lights"><i /><i /><i /></div>
          <div className="window-title"><Mark size={11} /> Example dashboard · Campus Comedy Night</div>
          <span className="pill pill-good hide-sm" style={{ fontSize: 11 }}><span className="live-dot" style={{ width: 6, height: 6 }} /> Selling</span>
        </div>
        <div className="app-grid" style={{ position: "relative" }}>
          <aside className="app-side">
            <div className="item on"><Chart size={15} /> Overview</div>
            <div className="item"><Ticket size={15} /> Tickets</div>
            <div className="item"><Shield size={15} /> Blocked</div>
            <div className="item"><Wallet size={15} /> Payouts</div>
            <div className="item"><Scan size={15} /> Door scanner</div>
            <div className="item"><Calendar size={15} /> Event page</div>
          </aside>
          <div className="app-main">
            <div className="mini-stats">
              <div className="mini-stat"><b>{sold}</b><span>of 300 sold</span></div>
              <div className="mini-stat"><b>₦{fmtNum(sold * 3000)}</b><span>naira received</span></div>
              <div className="mini-stat"><b className="gold">{fmtNum(blocked)}</b><span>bots blocked</span></div>
              <div className="mini-stat"><b>0</b><span>pending payouts</span></div>
            </div>
            <div className="bar" style={{ marginTop: 14 }}><motion.span animate={{ width: `${(sold / 300) * 100}%` }} transition={{ duration: 0.6 }} /></div>
            <div className="table">
              <div className="table-row"><span>Buyer</span><span>Paid in</span><span>Amount</span><span>Status</span></div>
              {ROWS.slice(0, shown).map((r, i) => (
                <motion.div key={i} className="table-row" initial={{ opacity: 0, backgroundColor: "rgba(253,177,41,0.12)" }} animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }} transition={{ duration: 0.9 }}>
                  <span>{r.who}</span><span className="muted">{r.tok}</span><span>{r.amt}</span>
                  <span className={`code-tag ${r.ok ? "ok" : "no"}`} style={{ justifySelf: "start" }}>{r.st}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <aside className="app-panel">
            <div className="eyebrow">Payout</div>
            <div className="mini-stat" style={{ marginTop: 12 }}>
              <span>Last conversion</span>
              <b style={{ fontSize: 18, marginTop: 4 }}>$2.10 → ₦3,000</b>
              <span className="mono">{rate ? `live rate ₦${fmtNum(rate, 2)}` : "Textile FX"}</span>
            </div>
            <div className="mini-stat" style={{ marginTop: 10 }}>
              <span>Door</span>
              <b style={{ fontSize: 18, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}><Qr size={16} /> 41 checked in</b>
              <span>Scanner open on 2 phones</span>
            </div>
          </aside>

          <motion.div
            className="cursor-tag"
            animate={{ left: ["62%", "30%", "48%", "75%", "62%"], top: ["30%", "62%", "78%", "44%", "30%"] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M4 3l7 18 2.5-7.5L21 11z" fill="var(--accent)" stroke="#000" strokeWidth="1.2" /></svg>
            <span>Tobi · door</span>
          </motion.div>
        </div>
      </div>
      <p className="small" style={{ position: "relative", marginTop: 14, color: "rgba(255,230,180,0.7)", textAlign: "center" }}>Example numbers. Your real dashboard fills in live as tickets sell.</p>
    </div>
  );
}
