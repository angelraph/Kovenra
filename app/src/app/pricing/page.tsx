import Link from "next/link";
import PageHead from "@/components/PageHead";
import { FaqItems } from "@/components/FaqList";
import { Reveal } from "@/components/motion";
import { FAQS } from "@/lib/faq";

export const metadata = { title: "Pricing", description: "Free to list. No monthly fee. Organizers receive the full naira price." };

export default function Pricing() {
  return (
    <>
      <PageHead crumb="Pricing" eyebrow="Pricing" title="Free to list. You keep your naira." lead="No sign-up fee, no monthly plan, no cut taken from your ticket price." />
      <section className="wrap" style={{ paddingBottom: 30 }}>
        <div className="grid grid-3">
          <Reveal>
            <div className="price-card">
              <span className="eyebrow">Organizers</span>
              <div className="amt">₦0</div>
              <p className="muted">to list an event, forever</p>
              <ul className="ticks">
                <li>Unlimited events and tickets</li>
                <li>Live dashboard and door scanner</li>
                <li>Naira payouts in seconds</li>
                <li>Bot protection with Self</li>
              </ul>
              <Link href="/new" className="btn" style={{ marginTop: "auto" }}>List an event</Link>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="price-card hot">
              <span className="eyebrow">Fans paying in USD₮</span>
              <div className="amt">~0.6%</div>
              <p className="muted">added to the dollar price</p>
              <ul className="ticks">
                <li>Covers the naira conversion so the organizer gets the full price</li>
                <li>No gas fees: payments are gasless</li>
                <li>Price worked out from the live Textile FX rate</li>
              </ul>
              <Link href="/events" className="btn btn-ghost" style={{ marginTop: "auto" }}>Find an event</Link>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="price-card">
              <span className="eyebrow">Fans paying in cNGN</span>
              <div className="amt">₦0</div>
              <p className="muted">extra. You pay the ticket price.</p>
              <ul className="ticks">
                <li>Goes straight to the organizer</li>
                <li>Never touches Kovenra</li>
                <li>One cNGN is always one naira</li>
              </ul>
              <Link href="/faq" className="btn btn-ghost" style={{ marginTop: "auto" }}>Questions?</Link>
            </div>
          </Reveal>
        </div>
        <p className="small faint" style={{ marginTop: 16 }}>Cashing cNGN out to a bank goes through the cNGN app, Busha or Quidax, and they may charge their own small fee.</p>
      </section>
      <section className="section">
        <div className="wrap faq">
          <div className="faq-head"><Reveal><h2>Money questions</h2></Reveal></div>
          <Reveal><FaqItems items={FAQS.filter((f) => f.cat === "Money" || f.q.includes("cost") || f.q.includes("get my money"))} /></Reveal>
        </div>
      </section>
    </>
  );
}
