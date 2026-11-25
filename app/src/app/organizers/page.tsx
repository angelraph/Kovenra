import Link from "next/link";
import AppWindow from "@/components/home/AppWindow";
import PageHead, { CtaBand } from "@/components/PageHead";
import { Arrow } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { Scene } from "@/components/Scene";

export const metadata = { title: "For organizers", description: "Sell tickets to real fans, get naira in seconds, and scan at the door from your phone." };

const WHO = [
  ["Concerts & shows", "Sell out to fans, not to resellers."],
  ["Campus events", "Freshers' nights, faculty dinners, departmental shows."],
  ["Church & gospel", "Concerts, conferences and retreats with fair seating."],
  ["Comedy & theatre", "Front rows that go to the people who'll laugh."],
  ["Tech & meetups", "Workshops, hackathons and paid meetups."],
  ["Parties & owambe", "Guest lists that can't be gate-crashed with screenshots."],
];

export default function Organizers() {
  return (
    <>
      <PageHead crumb="For organizers" eyebrow="For organizers" title="Sell to real fans. Get naira in seconds." lead="List in a minute, share one link, and watch it sell from your phone. Bots and touts are turned away for you.">
        <div className="row"><Link href="/new" className="btn btn-lg">List your event, free</Link><Link href="/pricing" className="btn btn-ghost btn-lg">See pricing</Link></div>
      </PageHead>
      <section className="wrap" style={{ paddingBottom: 30 }}><Reveal y={30}><AppWindow /></Reveal></section>

      <section className="section">
        <div className="wrap">
          <Reveal><p className="twotone">Everything you need on the night. <span>Nothing you don&apos;t.</span></p></Reveal>
          <div className="hair hair-3" style={{ marginTop: 40 }}>
            {[
              ["No account", "Fill one form. You get a public link and a private dashboard link that works like a key."],
              ["Your price, in naira", "Set it in naira. Fans can pay the dollar equivalent, and you still get naira."],
              ["Your rules", "Seats, tickets per person, 18+ check, and the verified-humans switch."],
              ["Instant payouts", "cNGN lands in your wallet seconds after each sale. Cash out to any Nigerian bank."],
              ["Door scanner", "Open it on as many phones as you need. Green, amber, red. Done."],
              ["Live dashboard", "Tickets sold, naira received, check-ins and every bot that was turned away."],
            ].map(([t, d]) => (
              <Reveal key={t}><div style={{ height: "100%" }}><h3>{t}</h3><p className="muted" style={{ marginTop: 8 }}>{d}</p></div></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head"><Reveal><h2>Who it&apos;s for</h2></Reveal><Reveal><Link href="/new" className="link-arrow">Start listing <Arrow size={16} /></Link></Reveal></div>
          <div className="scenes">
            {WHO.map(([t, d], i) => (
              <Reveal key={t} delay={(i % 4) * 0.05}>
                <div className="scene" style={{ aspectRatio: "1/1" }}>
                  <Scene kind={(["concert", "campus", "gospel", "comedy", "tech", "owambe"] as const)[i]} seed={0} className="art" w={600} />
                  <div className="scene-ctrl"><b style={{ color: "var(--text)", fontSize: 14 }}>{t}</b><div className="muted" style={{ marginTop: 2 }}>{d}</div></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <CtaBand title="Your next show, sold fairly" />
    </>
  );
}
