import { ImageResponse } from "next/og";
import { MARK_PATH, MARK_VIEWBOX } from "@/components/brand";

export const alt = "Kovenra · Fair tickets for real people, paid in naira";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, backgroundColor: "#0a0a0b", backgroundImage: "radial-gradient(circle at 85% 10%, rgba(253,177,41,0.32), rgba(10,10,11,0) 55%)", color: "#f4f4f5", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg viewBox={MARK_VIEWBOX} width={120} height={80}><path d={MARK_PATH} fill="#fdb129" /></svg>
          <div style={{ width: 3, height: 64, background: "#fdb129", borderRadius: 2 }} />
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -3 }}>Kovenra</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>Fair tickets for real people.</div>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02, color: "#fdb129" }}>Paid in naira.</div>
          <div style={{ fontSize: 30, color: "#a1a1aa", marginTop: 26 }}>One verified person, one seat · on Celo</div>
        </div>
      </div>
    ),
    size,
  );
}
