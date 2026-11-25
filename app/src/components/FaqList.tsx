"use client";

import { useMemo, useState } from "react";
import { FAQ_CATS, FAQS, type FaqCat } from "@/lib/faq";
import { Chevron } from "./icons";

export function FaqItems({ items, openFirst = false }: { items: typeof FAQS; openFirst?: boolean }) {
  return (
    <div className="qa">
      {items.map((f, i) => (
        <details key={f.q} open={openFirst && i === 0}>
          <summary>{f.q}<Chevron size={18} className="chev" /></summary>
          <div className="ans">{f.a.map((p, j) => <p key={j}>{p}</p>)}</div>
        </details>
      ))}
    </div>
  );
}

/** The full FAQ: category chips plus a search box. */
export default function FaqList() {
  const [cat, setCat] = useState<FaqCat | "All">("All");
  const [q, setQ] = useState("");
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return FAQS.filter((f) => (cat === "All" || f.cat === cat) && (!s || f.q.toLowerCase().includes(s) || f.a.join(" ").toLowerCase().includes(s)));
  }, [cat, q]);
  return (
    <div>
      <input placeholder="Search questions, e.g. refund, passport, naira" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search questions" style={{ marginBottom: 14 }} />
      <div className="faq-cats" role="tablist">
        {(["All", ...FAQ_CATS] as const).map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      {items.length ? <FaqItems items={items} openFirst /> : <p className="muted">No questions match that. Try another word, or <a className="gold" href="/contact">ask us</a>.</p>}
    </div>
  );
}
