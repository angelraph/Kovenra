"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "../icons";

const CHIPS = ["Campus comedy night", "Gospel concert", "Tech meetup", "Album listening party"];

/** A working "what are you hosting?" box that opens the create form with the title filled in (Framer's closing prompt). */
export default function AskBox() {
  const router = useRouter();
  const [v, setV] = useState("");
  const go = (title: string) => {
    const t = title.trim();
    router.push(t ? `/new?title=${encodeURIComponent(t.slice(0, 80))}` : "/new");
  };
  return (
    <>
      <form className="ask" onSubmit={(e) => { e.preventDefault(); go(v); }}>
        <label htmlFor="ask" className="sr-only">What are you hosting?</label>
        <textarea id="ask" placeholder="What are you hosting? e.g. Freshers' night at UNN, Saturday 8pm" value={v} onChange={(e) => setV(e.target.value)} maxLength={80}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(v); } }} />
        <div className="ask-bar">
          <span>Free to list · takes about a minute</span>
          <button className="ask-go" type="submit" aria-label="Start listing"><Send size={18} /></button>
        </div>
      </form>
      <div className="chips">
        {CHIPS.map((c) => <button key={c} className="chip" onClick={() => go(c)}>{c}</button>)}
      </div>
    </>
  );
}
