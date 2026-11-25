"use client";

import { Mark } from "../brand";
import { useLive } from "../live";
import { CountUp } from "../motion";

/** Figma's quote-plus-number block, using Kovenra's own promise and a live number. */
export default function Promise() {
  const { stats } = useLive();
  return (
    <div className="quote">
      <blockquote>
        “A ticket should go to the person who wants to be there, <span>not to whoever runs the most bots.</span> That&apos;s the whole promise: one real person, one fair seat.”
        <div className="quote-by">
          <div className="ring-av"><div><Mark size={12} /></div></div>
          <div><b style={{ color: "var(--text)" }}>The Kovenra covenant</b><br />Why the name means “promise”</div>
        </div>
      </blockquote>
      <div className="stat-side">
        <div className="big-num goldtext"><CountUp value={stats?.botsBlocked ?? 0} /></div>
        <p className="muted" style={{ marginTop: 10 }}>bots and unverified agents turned away by Kovenra so far</p>
        <p className="small faint" style={{ marginTop: 18 }}>Live count from every event on Kovenra.</p>
      </div>
    </div>
  );
}
