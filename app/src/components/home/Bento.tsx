"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Mark } from "../brand";
import { Bot, Check, Shield, User, X } from "../icons";
import { Reveal } from "../motion";
import { Scene, type SceneKind } from "../Scene";

function useCycle(n: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => clearInterval(iv);
  }, [n, ms]);
  return i;
}

const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: "12px 14px", fontSize: 13.5, boxShadow: "0 18px 40px -20px rgba(0,0,0,0.8)" };

function OnePerson() {
  const i = useCycle(3, 1800);
  return (
    <div style={{ width: "100%", maxWidth: 270, display: "grid", gap: 10 }}>
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 10, background: "var(--accent)", display: "grid", placeItems: "center", color: "var(--accent-ink)" }}><User size={16} /></span>
        <span>Ada · agent 1</span>
        <span className="code-tag ok" style={{ marginLeft: "auto" }}>200 ticket</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: [30, -6, 4, 0] }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }} style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 10, background: "var(--card-3)", display: "grid", placeItems: "center" }}><Bot size={16} /></span>
          <span>Ada · agent {i + 2}</span>
          <span className="code-tag no" style={{ marginLeft: "auto" }}>429 limit</span>
        </motion.div>
      </AnimatePresence>
      <p className="mono faint" style={{ fontSize: 11.5, textAlign: "center" }}>same human, same limit</p>
    </div>
  );
}

function NairaFast() {
  const i = useCycle(3, 2200);
  const amounts = ["₦15,000", "₦5,000", "₦2,000"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.2, repeat: Infinity }} className="token" style={{ background: "linear-gradient(145deg,#26a17b,#137a5a)" }}>₮</motion.div>
      <div style={{ position: "relative", width: 70, height: 2, background: "var(--line-2)", overflow: "hidden", borderRadius: 2 }}>
        <motion.span animate={{ x: ["-100%", "250%"] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }} style={{ position: "absolute", width: 28, height: 2, background: "var(--accent)" }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.2, repeat: Infinity, delay: 0.4 }} className="token" style={{ background: "linear-gradient(145deg,#1f9d55,#0f5132)" }}>₦</motion.div>
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mono small" style={{ marginTop: 8, color: "var(--good)" }}>{amounts[i]}</motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function QrDoor() {
  const i = useCycle(2, 2600);
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: 128, height: 128, borderRadius: 18, background: "#fff", padding: 12, overflow: "hidden" }}>
        <svg viewBox="0 0 21 21" width="104" height="104" shapeRendering="crispEdges" aria-hidden>
          {Array.from({ length: 21 * 21 }).map((_, k) => {
            const x = k % 21, y = Math.floor(k / 21);
            const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
            const on = finder ? (x % 6 === 0 || y % 6 === 0 || (x % 7 > 1 && x % 7 < 5 && y % 7 > 1 && y % 7 < 5) || x === 20 || y === 20 || x === 14 || y === 14) : ((x * 7 + y * 13 + x * y) % 5 < 2);
            return on ? <rect key={k} x={x} y={y} width="1" height="1" fill="#0a0a0b" /> : null;
          })}
        </svg>
        <motion.div animate={{ y: [0, 110, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} style={{ position: "absolute", left: 6, right: 6, top: 6, height: 3, borderRadius: 3, background: "var(--accent)", boxShadow: "0 0 18px 4px rgba(253,177,41,0.7)" }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={`result ${i === 0 ? "result-ok" : "result-used"}`} style={{ fontSize: 15, padding: "8px 16px" }}>
          {i === 0 ? "Welcome in" : "Already used"}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const REASONS = ["No Self Agent ID signature", "Invalid signature", "Agent not verified", "Under 18", "Sold out for bots"];
function BotsAway() {
  const [items, setItems] = useState<number[]>([0, 1, 2]);
  useEffect(() => {
    let n = 3;
    const iv = setInterval(() => setItems((xs) => [...xs.slice(-2), n++]), 1500);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ width: "100%", maxWidth: 270, display: "grid", gap: 8 }}>
      <AnimatePresence initial={false}>
        {items.map((k) => (
          <motion.div key={k} layout initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45 }} style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--bad)" }}><X size={16} /></span>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{REASONS[k % REASONS.length]}</span>
            <span className="code-tag no" style={{ marginLeft: "auto" }}>403</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function AgePrivate() {
  return (
    <div style={{ ...card, width: "100%", maxWidth: 260, padding: 16 }}>
      <div className="row between"><span className="mono faint" style={{ fontSize: 11 }}>WHAT KOVENRA SEES</span><Shield size={16} className="gold" /></div>
      {["Name", "Passport no.", "Birthday"].map((f) => (
        <div key={f} className="row between" style={{ marginTop: 10 }}>
          <span className="muted">{f}</span>
          <span style={{ width: 90, height: 10, borderRadius: 5, background: "repeating-linear-gradient(90deg,#2a2a30 0 6px,#1d1d22 6px 12px)" }} />
        </div>
      ))}
      <motion.div animate={{ boxShadow: ["0 0 0 0 rgba(52,211,153,0)", "0 0 0 6px rgba(52,211,153,0.15)", "0 0 0 0 rgba(52,211,153,0)"] }} transition={{ duration: 2, repeat: Infinity }} className="row between" style={{ marginTop: 14, padding: "8px 10px", borderRadius: 10, background: "rgba(52,211,153,0.1)", color: "var(--good)" }}>
        <span>Over 18</span><span className="row" style={{ gap: 4 }}><Check size={15} /> yes</span>
      </motion.div>
    </div>
  );
}

function AgentsWelcome() {
  const i = useCycle(3, 1700);
  return (
    <div style={{ width: "100%", maxWidth: 270, display: "grid", gap: 8 }}>
      <div className="bubble" style={{ fontSize: 13.5 }}>Get me a ticket when it drops</div>
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", background: "#111", border: "1px solid var(--line)" }}><Mark size={12} /></span>
        <AnimatePresence mode="wait">
          <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {i === 0 ? <span className="shimmer">Signing with Self Agent ID…</span> : i === 1 ? <span className="shimmer">Paying 402 in USD₮…</span> : <span style={{ color: "var(--good)" }}>Ticket in your wallet ✓</span>}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

const TILES: { t: string; d: string; v: React.ReactNode; k: SceneKind; s: number }[] = [
  { t: "One person, one ticket", d: "Seats are counted per human, not per account. Ten agents from one person still share one limit.", v: <OnePerson />, k: "campus", s: 0 },
  { t: "Naira in seconds", d: "Dollar payments convert to cNGN on Textile FX and land in the organizer's wallet.", v: <NairaFast />, k: "festival", s: 1 },
  { t: "QR at the door", d: "Each ticket works once. The organizer's phone is the scanner.", v: <QrDoor />, k: "concert", s: 1 },
  { t: "Bots turned away", d: "Requests without a verified human are refused before any payment happens.", v: <BotsAway />, k: "tech", s: 1 },
  { t: "18+ without showing ID", d: "Self proves age privately. Kovenra only ever sees a yes or a no.", v: <AgePrivate />, k: "owambe", s: 0 },
  { t: "AI agents welcome", d: "Verified agents can buy for their human over x402. Unverified ones can't.", v: <AgentsWelcome />, k: "tech", s: 0 },
];

export default function Bento() {
  return (
    <div className="bento">
      {TILES.map((x, i) => (
        <Reveal key={x.t} delay={(i % 3) * 0.08}>
          <div className="tile tile-photo" style={{ height: "100%" }}>
            <div className="tile-bg" aria-hidden><Scene kind={x.k} seed={x.s} w={600} /></div>
            <h3>{x.t}</h3>
            <p>{x.d}</p>
            <div className="tile-viz">{x.v}</div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
