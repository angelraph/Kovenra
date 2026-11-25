"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "../icons";

const STEPS = [
  { tag: "GET", cls: "", text: "Found “Comedy Night”, Ibadan · ₦10,000", ms: "180ms" },
  { tag: "403", cls: "no", text: "First try without a signature: refused", ms: "92ms" },
  { tag: "SELF", cls: "ok", text: "Signed with Self Agent ID · verified human", ms: "310ms" },
  { tag: "402", cls: "pay", text: "Price quoted: 7.04 USD₮ or 10,000 cNGN", ms: "140ms" },
  { tag: "PAY", cls: "pay", text: "Paid 7.04 USD₮, gasless, settled on Celo", ms: "2.1s" },
  { tag: "200", cls: "ok", text: "Ticket kv1.7Q2… issued · QR in wallet", ms: "120ms" },
];

const SNIPPETS: Record<string, string> = {
  request: `<span class="c"># 1. Find the event</span>
<span class="k">GET</span>  /api/events/comedy-night

<span class="c"># 2. Buy, signed by a verified human's agent</span>
<span class="k">POST</span> /api/events/comedy-night/buy
x-self-agent-signature: 0x…
PAYMENT-SIGNATURE: …   <span class="c"># x402, USD₮ or cNGN</span>`,
  responses: `<span class="s">200</span> { ticket: { id, code, url } }
<span class="k">402</span> PAYMENT-REQUIRED  <span class="c"># USD₮ (EIP-3009) or cNGN (Permit2)</span>
<span class="k">403</span> human_verification_required
<span class="k">429</span> per_person_limit  <span class="c"># shared across all of one human's agents</span>`,
  skill: `<span class="c"># Give this to any agent</span>
curl -s https://kovenra.vercel.app/skill.md

<span class="c"># It explains: find events, sign with Self Agent ID,
# pay the 402 over x402, read the ticket back.</span>`,
};

export default function AgentDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-15% 0px" });
  const [n, setN] = useState(0);
  const [tab, setTab] = useState<keyof typeof SNIPPETS>("request");
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("https://kovenra.vercel.app/skill.md");

  useEffect(() => setUrl(`${window.location.origin}/skill.md`), []);
  useEffect(() => {
    if (!inView) return;
    const iv = setInterval(() => setN((x) => (x >= STEPS.length + 3 ? 0 : x + 1)), 900);
    return () => clearInterval(iv);
  }, [inView]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div ref={ref}>
      <div className="chat" aria-label="Example of an AI agent buying a ticket">
        <div className="bubble">Get me one ticket for the comedy night in Ibadan. Max ₦12k.</div>
        <div className="row" style={{ gap: 8, fontSize: 13.5 }}>
          {n < STEPS.length ? <span className="shimmer">Working on it…</span> : <span style={{ color: "var(--good)" }}>Done. Your ticket is in your wallet.</span>}
        </div>
        <div className="log">
          <AnimatePresence initial={false}>
            {STEPS.slice(0, Math.min(n, STEPS.length)).map((s) => (
              <motion.div key={s.text} className="log-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                <span className={`code-tag ${s.cls}`}>{s.tag}</span>
                <span>{s.text}</span>
                <span className="ms">{s.ms}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {n >= STEPS.length && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="ticket" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14, marginTop: "auto" }}>
            <div style={{ width: 54, height: 54, borderRadius: 12, background: "#fff", display: "grid", placeItems: "center", color: "#000" }}><Check size={26} /></div>
            <div>
              <div className="mono gold" style={{ fontSize: 11, letterSpacing: "0.1em" }}>SAT · 8:00 PM</div>
              <b style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>Comedy Night · Ibadan</b>
              <div className="small muted">1 ticket · works once at the door</div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="window term">
        <div className="window-bar"><div className="lights"><i /><i /><i /></div><div className="window-title mono">kovenra-agent</div></div>
        <div className="tabs" role="tablist">
          {(Object.keys(SNIPPETS) as (keyof typeof SNIPPETS)[]).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{k}</button>
          ))}
        </div>
        <pre className="code" style={{ margin: "0 10px", border: 0 }} dangerouslySetInnerHTML={{ __html: SNIPPETS[tab] }} />
        <div className="copy">
          <input readOnly value={url} aria-label="Agent skill file address" onFocus={(e) => e.currentTarget.select()} />
          <button className="btn btn-ghost btn-sm" onClick={copy} style={{ minHeight: 50 }}>{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}</button>
        </div>
      </div>
    </div>
  );
}
