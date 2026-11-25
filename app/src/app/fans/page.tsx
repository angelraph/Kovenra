import Link from "next/link";
import PageHead, { CtaBand } from "@/components/PageHead";
import { Reveal } from "@/components/motion";
import { FaqItems } from "@/components/FaqList";
import { FAQS } from "@/lib/faq";

export const metadata = { title: "For fans", description: "Verify once, buy fairly, walk in with a QR code. No touts, no triple prices." };

export default function Fans() {
  return (
    <>
      <PageHead crumb="For fans" eyebrow="For fans" title="Get in at the real price" lead="When tickets go to real people, you don't have to buy from a tout at three times the price. Here's how it works for you.">
        <Link href="/events" className="btn btn-lg">Find an event</Link>
      </PageHead>

      <section className="wrap" style={{ paddingBottom: 40 }}>
        <div className="grid grid-3">
          {[
            ["1", "Verify once", "Download the free Self app and scan your passport's chip. Takes about two minutes, and you only do it once."],
            ["2", "Pay from your phone", "Pay in USD₮ from MiniPay or any Celo wallet, or in cNGN. No card, no failed bank transfer."],
            ["3", "Walk in", "Your ticket is a QR code on a normal link. It works once at the door, so nobody can copy it."],
          ].map(([n, t, d], i) => (
            <Reveal key={n} delay={i * 0.06}>
              <div className="tile" style={{ minHeight: 0, padding: 26 }}>
                <div className="big-num goldtext" style={{ textAlign: "left" }}>{n}</div>
                <h3 style={{ textAlign: "left", marginTop: 16 }}>{t}</h3>
                <p style={{ textAlign: "left" }}>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="wrap feature-row">
          <Reveal>
            <span className="eyebrow">Your privacy</span>
            <h2 style={{ marginTop: 14 }}>We never see your passport</h2>
            <p className="lead" style={{ marginTop: 16 }}>Self reads your passport on your own phone. Kovenra only gets a yes: real person, unique, and over 18 if the event needs it.</p>
            <Link href="/trust" className="btn btn-ghost" style={{ marginTop: 22 }}>Read about trust & safety</Link>
          </Reveal>
          <Reveal delay={0.1}><FaqItems items={FAQS.filter((f) => f.cat === "Fans" || f.cat === "Privacy").slice(0, 6)} /></Reveal>
        </div>
      </section>
      <CtaBand title="Find something on this weekend" sub="New events are listed every week, across Nigeria." />
    </>
  );
}
