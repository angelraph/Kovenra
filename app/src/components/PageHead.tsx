import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "./motion";

export default function PageHead({ crumb, eyebrow, title, lead, children }: { crumb: string; eyebrow?: string; title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <section className="page-head">
      <div className="wrap">
        <div className="crumbs"><Link href="/">Home</Link><span>/</span><span>{crumb}</span></div>
        {eyebrow && <Reveal><span className="eyebrow" style={{ marginTop: 26 }}>{eyebrow}</span></Reveal>}
        <Reveal delay={0.05}><h1>{title}</h1></Reveal>
        {lead && <Reveal delay={0.1}><p className="lead">{lead}</p></Reveal>}
        {children && <Reveal delay={0.15}><div style={{ marginTop: 26 }}>{children}</div></Reveal>}
      </div>
    </section>
  );
}

export function CtaBand({ title = "Ready when you are", sub = "Free to list. Your first event can be live in about a minute." }: { title?: string; sub?: string }) {
  return (
    <section className="section" style={{ paddingTop: 20 }}>
      <div className="wrap">
        <Reveal>
          <div className="floaty" style={{ padding: "64px 20px" }}>
            <h2>{title}</h2>
            <p className="muted" style={{ margin: "14px auto 0", maxWidth: 520 }}>{sub}</p>
            <div className="row" style={{ justifyContent: "center", marginTop: 26 }}>
              <Link href="/new" className="btn btn-lg">List your event</Link>
              <Link href="/events" className="btn btn-ghost btn-lg">Find an event</Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
