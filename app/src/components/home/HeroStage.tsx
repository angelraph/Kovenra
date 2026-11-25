"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Left, Pause, Play, Right } from "../icons";
import { fmtNum, useLive } from "../live";
import { Scene, SCENES } from "../Scene";

const SLIDE_MS = 6000;

/** What a fan (or their agent) asks for on each slide. Prices are in naira; dollars come from the live rate. */
const ASKS = [
  { text: "Two tickets for Saturday's concert in Abuja", naira: 15000 },
  { text: "One seat at the campus show, Nsukka", naira: 3000 },
  { text: "Gospel night in Port Harcourt for me and my sister", naira: 5000 },
  { text: "Front row for the comedy special in Ibadan", naira: 10000 },
  { text: "Ticket for Friday's tech meetup in Enugu", naira: 2000 },
  { text: "Owambe on Sunday, Lagos. Just me", naira: 7500 },
];

export default function HeroStage() {
  const reduce = useReducedMotion();
  const { rate, chain } = useLive();
  const scenes = SCENES.slice(0, 6);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState(0); // 0 typing, 1 verifying, 2 paying, 3 ticket
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());
  const ask = ASKS[active];

  // typing + steps for the current slide
  useEffect(() => {
    setTyped("");
    setPhase(0);
    startRef.current = Date.now();
    let i = 0;
    const type = setInterval(() => {
      i++;
      setTyped(ask.text.slice(0, i));
      if (i >= ask.text.length) clearInterval(type);
    }, reduce ? 1 : 28);
    const t1 = setTimeout(() => setPhase(1), reduce ? 0 : 1900);
    const t2 = setTimeout(() => setPhase(2), reduce ? 0 : 3100);
    const t3 = setTimeout(() => setPhase(3), reduce ? 0 : 4300);
    return () => {
      clearInterval(type);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [active, ask.text, reduce]);

  // autoplay with a progress ring on the pause button (Figma)
  useEffect(() => {
    if (!playing) return;
    startRef.current = Date.now() - progress * SLIDE_MS;
    const iv = setInterval(() => {
      const p = (Date.now() - startRef.current) / SLIDE_MS;
      if (p >= 1) {
        setActive((a) => (a + 1) % scenes.length);
        setProgress(0);
        startRef.current = Date.now();
      } else setProgress(p);
    }, 50);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, scenes.length]);

  const go = (d: number) => {
    setActive((a) => (a + d + scenes.length) % scenes.length);
    setProgress(0);
    startRef.current = Date.now();
  };

  const usd = useMemo(() => (rate ? (ask.naira / rate) * 1.006 : null), [rate, ask.naira]);
  const C = 2 * Math.PI * 18;

  return (
    <div className="stage" aria-label="How a fair ticket drop looks on Kovenra">
      <div className="stage-live">
        <span className="live-dot" />
        {chain ? `LIVE · CELO #${Number(chain.block).toLocaleString("en-US")}` : "LIVE · CELO"}
      </div>
      <div className="stage-ctrl">
        <span className="stage-count">{active + 1} OF {scenes.length}</span>
        <button className="ctrl-btn" onClick={() => go(-1)} aria-label="Previous slide"><Left size={16} /></button>
        <button className="ctrl-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
          <svg className="ring" viewBox="0 0 40 40" aria-hidden>
            <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
            <circle cx="20" cy="20" r="18" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} strokeLinecap="round" />
          </svg>
          {playing ? <Pause size={15} /> : <Play size={14} />}
        </button>
        <button className="ctrl-btn" onClick={() => go(1)} aria-label="Next slide"><Right size={16} /></button>
      </div>

      <div className="stage-inner">
        {scenes.map((s, i) => {
          let off = i - active;
          if (off > scenes.length / 2) off -= scenes.length;
          if (off < -scenes.length / 2) off += scenes.length;
          const abs = Math.abs(off);
          const scale = abs === 0 ? 1 : abs === 1 ? 0.8 : 0.66;
          const x = off * 62; // % of card width
          return (
            <motion.div
              key={s.kind}
              className="cover"
              onClick={() => { setActive(i); setProgress(0); }}
              animate={{ x: `${-50 + x}%`, scale, opacity: abs > 2 ? 0 : abs === 2 ? 0.5 : abs === 1 ? 0.8 : 1, zIndex: 10 - abs, filter: abs === 0 ? "brightness(1)" : "brightness(0.6)" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ x: "-50%" }}
              aria-hidden={abs !== 0}
            >
              <Scene kind={s.kind} seed={0} w={700} priority={abs <= 1} />
              <div className="cover-cap"><b>{s.title}</b><span>{s.city}</span></div>
            </motion.div>
          );
        })}

        <div className="prompt" role="status" aria-live="polite">
          <div className="prompt-text">{typed}{phase === 0 && <span className="caret" />}</div>
          <div className="prompt-steps">
            <span className={`step-chip ${phase > 1 ? "done" : phase === 1 ? "now" : ""}`}>
              {phase > 1 ? <Check size={13} /> : null}
              {phase === 1 ? <span className="shimmer">Checking with Self…</span> : "Real person · Self"}
            </span>
            <span className={`step-chip ${phase > 2 ? "done" : phase === 2 ? "now" : ""}`}>
              {phase > 2 ? <Check size={13} /> : null}
              {phase === 2 ? <span className="shimmer">Paying over x402…</span> : `₦${fmtNum(ask.naira)}${usd ? ` ≈ $${usd.toFixed(2)} USD₮` : ""}`}
            </span>
            <span className={`step-chip ${phase === 3 ? "done" : ""}`}>
              {phase === 3 ? <Check size={13} /> : null}
              {phase === 3 ? "Ticket ready · QR" : "Ticket"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
