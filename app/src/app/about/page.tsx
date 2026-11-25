import PageHead, { CtaBand } from "@/components/PageHead";
import { Mark } from "@/components/brand";
import { Reveal } from "@/components/motion";

export const metadata = { title: "About", description: "Why Kovenra exists, and what the name means." };

export default function About() {
  return (
    <>
      <PageHead crumb="About" eyebrow="About" title="We think tickets should go to the people who want to be there" />
      <section className="wrap" style={{ paddingBottom: 40 }}>
        <div className="feature-row" style={{ alignItems: "start" }}>
          <Reveal>
            <div className="prose">
              <p>Every December the same thing happens. A big show is announced, the link goes live, and a few minutes later it&apos;s sold out. Then the tickets show up on WhatsApp and X for double or triple the price.</p>
              <p>The fans who refreshed all morning lose. The organizer looks bad, even though they did nothing wrong. The only winners are whoever ran the most bots and fake accounts.</p>
              <p>Kovenra fixes the one thing that makes this possible: that a single person can buy as many tickets as they have accounts. On Kovenra each buyer proves they&apos;re a real, unique person, privately, with Self. One person gets one fair go, however many accounts or agents they have.</p>
              <p>We also wanted organizers to get paid properly. Fans can pay in dollars or naira, and the organizer always receives naira, in seconds, in their own wallet.</p>
              <h2>The name</h2>
              <p>Kovenra comes from <strong>covenant</strong>, which means a promise. Ours is simple: <strong>one real person, one fair seat.</strong></p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="texture" style={{ display: "grid", placeItems: "center", minHeight: 380 }}>
              <Mark size={120} />
            </div>
          </Reveal>
        </div>
      </section>
      <CtaBand title="Come build fairer nights with us" />
    </>
  );
}
