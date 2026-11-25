import PageHead from "@/components/PageHead";
import { Logo, Mark } from "@/components/brand";
import { Reveal } from "@/components/motion";

export const metadata = { title: "Brand", description: "The Kovenra logo, colours and type." };

const COLORS = [
  ["Kovenra gold", "#FDB129", "#1a1203"],
  ["Night", "#0A0A0B", "#f4f4f5"],
  ["Charcoal", "#141416", "#f4f4f5"],
  ["Off-white", "#F4F4F5", "#0a0a0b"],
  ["Verified mint", "#34D399", "#04261a"],
];

export default function Brand() {
  return (
    <>
      <PageHead crumb="Brand" eyebrow="Brand" title="The Kovenra mark" lead="A ticket stub that forms a K, with a check mark cut out of it. One verified ticket, for one real person." />
      <section className="wrap" style={{ paddingBottom: 30 }}>
        <div className="grid grid-2">
          <Reveal><div className="texture" style={{ display: "grid", placeItems: "center", minHeight: 300 }}><Logo size={56} /></div></Reveal>
          <Reveal delay={0.06}><div className="card" style={{ display: "grid", placeItems: "center", minHeight: 300, background: "#f4f4f5" }}><span className="logo" style={{ fontSize: 46 }}><Mark size={56} color="#0a0a0b" /><span className="logo-divider" style={{ background: "#0a0a0b" }} /><span style={{ color: "#0a0a0b" }}>Kovenra</span></span></div></Reveal>
        </div>
        <div className="row" style={{ marginTop: 16, gap: 16, alignItems: "end" }}>
          {[96, 64, 40, 24, 16].map((s) => (
            <div key={s} style={{ textAlign: "center" }}>
              <div style={{ width: s + 24, height: s + 24, borderRadius: (s + 24) * 0.24, background: "#0b0b0c", border: "1px solid var(--line)", display: "grid", placeItems: "center" }}><Mark size={s * 0.62} /></div>
              <div className="mono small faint" style={{ marginTop: 6 }}>{s}px</div>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <Reveal><h2 style={{ fontSize: "clamp(26px,3.4vw,38px)" }}>Colours</h2></Reveal>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", marginTop: 20 }}>
            {COLORS.map(([n, hex, ink]) => (
              <Reveal key={hex}><div className="swatch" style={{ background: hex, color: ink }}><b>{n}</b><span>{hex}</span></div></Reveal>
            ))}
          </div>
          <Reveal><h2 style={{ fontSize: "clamp(26px,3.4vw,38px)", marginTop: 60 }}>Type</h2></Reveal>
          <div className="grid grid-3" style={{ marginTop: 20 }}>
            <div className="card"><div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 44, letterSpacing: "-0.04em" }}>Aa</div><b>Plus Jakarta Sans</b><p className="muted small">Headlines and the wordmark</p></div>
            <div className="card"><div style={{ fontSize: 44 }}>Aa</div><b>Inter Tight</b><p className="muted small">Everything you read</p></div>
            <div className="card"><div className="mono" style={{ fontSize: 40 }}>Aa</div><b>JetBrains Mono</b><p className="muted small">Labels, numbers and code</p></div>
          </div>
          <Reveal>
            <div className="prose" style={{ marginTop: 50 }}>
              <h2>Using the logo</h2>
              <ul>
                <li>Gold on black is the main version. Black on white is for light backgrounds.</li>
                <li>Leave space around it, at least the height of the check mark.</li>
                <li>Don&apos;t stretch it, recolour it, or add shadows and gradients.</li>
              </ul>
              <p><a href="/brand/kovenra-icon-512.png" download>Download the icon (PNG, 512px)</a> · <a href="/brand/kovenra-brand-sheet.png" download>Download the brand sheet</a></p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
