import { ImageResponse } from "next/og";
import { MARK_PATH, MARK_VIEWBOX } from "@/components/brand";
import { fairnessReport } from "@/lib/report";
import { getStore } from "@/lib/store";

export const alt = "Kovenra fairness report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Shareable card for an event's fairness report. */
export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const store = getStore();
  const e = await store.getEventBySlug((await params).slug);
  const r = e ? await fairnessReport(e, store) : null;
  const stat = (n: string | number, label: string, gold = false) => (
    <div style={{ display: "flex", flexDirection: "column", padding: "26px 30px", background: "#141416", borderRadius: 24, flex: 1 }}>
      <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, color: gold ? "#fdb129" : "#f4f4f5" }}>{String(n)}</div>
      <div style={{ fontSize: 24, color: "#a1a1aa", marginTop: 6 }}>{label}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 60, backgroundColor: "#0a0a0b", color: "#f4f4f5", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg viewBox={MARK_VIEWBOX} width={84} height={56}><path d={MARK_PATH} fill="#fdb129" /></svg>
          <div style={{ fontSize: 30, color: "#a1a1aa" }}>Fairness report</div>
        </div>
        <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>{r ? r.event.title : "Kovenra event"}</div>
        <div style={{ display: "flex", gap: 18 }}>
          {stat(r?.totals.uniqueHumans ?? 0, "real people got tickets")}
          {stat(r?.totals.botsBlocked ?? 0, "bots turned away", true)}
          {stat(0, "resold above face value")}
        </div>
      </div>
    ),
    size,
  );
}
