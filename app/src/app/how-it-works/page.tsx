import Link from "next/link";
import PageHead, { CtaBand } from "@/components/PageHead";
import { Arrow } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { Scene } from "@/components/Scene";

export const metadata = { title: "How it works", description: "How Kovenra sells one ticket per verified person and pays organizers in naira on Celo." };

const FLOW = [
  { t: "The organizer lists the event", d: "Name, venue, naira price, number of seats, tickets per person, and an optional 18+ check. No account, no listing fee. They get a public link and a private dashboard." },
  { t: "The fan verifies once with Self", d: "They scan their passport's chip in the free Self app. Self keeps the details on their phone and gives Kovenra a proof: a real, unique person (and over 18 if needed). Never a name or a photo." },
  { t: "The fan, or their agent, asks to buy", d: "Kovenra checks the Self signature against the registry on Celo mainnet. No verified human means a polite no, before any money moves." },
  { t: "One seat per person is held", d: "Kovenra holds a seat against the person's anonymous Self number. All of one person's agents share it, so a second agent from the same person hits the same limit." },
  { t: "Payment over x402", d: "The fan pays in USD₮ (gasless) or cNGN. Celo's x402 facilitator settles it on-chain before the ticket is written." },
  { t: "Naira lands with the organizer", d: "USD₮ is converted to cNGN on Textile FX and sent to the organizer's wallet in seconds. cNGN payments go straight to them." },
  { t: "QR at the door", d: "The ticket is a signed QR code that works once. The organizer's phone scans it: green, amber for already used, red for fake." },
];

export default function HowItWorks() {
  return (
    <>
      <PageHead crumb="How it works" eyebrow="The full flow" title="From listing to the door, in seven steps" lead="Here's exactly what happens when someone lists an event and someone else buys a ticket. Nothing hidden." />
      <section className="wrap" style={{ paddingBottom: 40 }}>
        <div className="numbered">
          {FLOW.map((s, i) => (
            <Reveal key={s.t} delay={(i % 3) * 0.05}><div><h3>{s.t}</h3><p>{s.d}</p></div></Reveal>
          ))}
        </div>
      </section>

      <section className="section" id="fair-drop">
        <div className="wrap">
          <Reveal><span className="eyebrow">New</span><h2 style={{ marginTop: 14 }}>Fair Drop and face-value resale</h2></Reveal>
          <div className="hair hair-3" style={{ marginTop: 30 }}>
            <Reveal><div style={{ height: "100%" }}><h3>1. Enter, don&apos;t race</h3><p className="muted" style={{ marginTop: 8 }}>For hot shows, verified people enter a draw during a window. One entry per person, whichever agent or phone they use. Bots can&apos;t enter at all.</p></div></Reveal>
            <Reveal delay={0.05}><div style={{ height: "100%" }}><h3>2. A Celo block picks</h3><p className="muted" style={{ marginTop: 8 }}>When entries close, the hash of the next Celo block decides the order. Nobody can know it in advance, and anyone can recompute it from the fairness report.</p></div></Reveal>
            <Reveal delay={0.1}><div style={{ height: "100%" }}><h3>3. Resale only at face value</h3><p className="muted" style={{ marginTop: 8 }}>Can&apos;t go? Hand the ticket back. The next verified fan buys it at the original price, your QR stops working, and your money comes back automatically.</p></div></Reveal>
          </div>
          <Reveal><p className="muted" style={{ marginTop: 22 }}>Every event has a public fairness report: real people served, bots turned away, the most tickets any one person got, every resale, the draw proof and every transaction.</p></Reveal>
        </div>
      </section>

      <section className="section" id="naira">
        <div className="wrap feature-row">
          <Reveal>
            <span className="eyebrow">Naira payouts</span>
            <h2 style={{ marginTop: 14 }}>Dollars in, naira out</h2>
            <p className="lead" style={{ marginTop: 16 }}>When a fan pays in USD₮, Kovenra gets a firm quote from Textile FX for exactly that amount, swaps it to cNGN, and sends the cNGN to the organizer.</p>
            <ul className="ticks" style={{ marginTop: 22 }}>
              <li>A small buffer (about 0.6%) on the dollar price makes sure the naira always covers the ticket price.</li>
              <li>The approve, swap and payout each carry Kovenra&apos;s ERC-8021 attribution tag, so anyone can check them on Celoscan.</li>
              <li>If a conversion ever fails, a retry job picks it up and the dashboard shows it as pending until it lands.</li>
            </ul>
            <Link href="/proof" className="link-arrow" style={{ marginTop: 22 }}>See every payout live <Arrow size={16} /></Link>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="hair">
              {[["Fan pays", "7.04 USD₮", "x402 · gasless"], ["Textile FX", "7.04 USD₮ → 10,0xx cNGN", "firm RFQ quote"], ["Organizer gets", "₦10,000+", "cNGN in their wallet"]].map(([a, b, c]) => (
                <div key={a} className="row between"><div><div className="eyebrow">{a}</div><div className="kpi" style={{ marginTop: 8 }}><b>{b}</b></div></div><span className="pill">{c}</span></div>
              ))}
            </div>
            <p className="small faint" style={{ marginTop: 10 }}>Example for a ₦10,000 ticket. The real rate is live on the home page.</p>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap feature-row flip">
          <Reveal>
            <span className="eyebrow">Fairness</span>
            <h2 style={{ marginTop: 14 }}>Why bots can&apos;t win here</h2>
            <p className="lead" style={{ marginTop: 16 }}>Most ticket sites count accounts. Kovenra counts people. A tout can make a thousand accounts, but they only have one passport.</p>
            <ul className="ticks" style={{ marginTop: 22 }}>
              <li>Unverified requests are refused before payment (403).</li>
              <li>The per-person limit is shared across every account and agent one person has (429).</li>
              <li>Seats are held for five minutes while someone pays, so nobody gets charged for a sold-out show.</li>
            </ul>
          </Reveal>
          <Reveal delay={0.1}><div className="scene" style={{ aspectRatio: "4/3" }}><Scene kind="concert" seed={42} className="art" /></div></Reveal>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
