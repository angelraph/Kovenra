import Link from "next/link";
import PageHead from "@/components/PageHead";
import { Reveal } from "@/components/motion";

export const metadata = { title: "Verify with Self", description: "How to prove you're a real person with the free Self app, step by step, in about two minutes." };

const STEPS = [
  { t: "Get the Self app", d: "It's free. Search “Self – Human & Agent Identity” in your app store, or use the links below." },
  { t: "Scan your passport's photo page", d: "Open Self and tap Get started. Point the camera at the page with your photo so it can read the two lines of letters at the bottom." },
  { t: "Hold your phone on the passport", d: "Lay the phone flat on the passport for 10–20 seconds while it reads the chip. On Android, switch NFC on first and use the middle of the back of the phone. On iPhone, use the top edge." },
  { t: "Come back here and tap Verify", d: "On the event page, tap Verify with Self. Scan the code with the Self app (or tap Open the Self app on your phone) and approve. You're done for every Kovenra event from then on." },
];

export default function Verify() {
  return (
    <>
      <PageHead crumb="Verify with Self" eyebrow="Two minutes, once" title="Prove you're a real person, privately" lead="Kovenra sells one ticket per real person. Self checks that on your own phone and only tells us yes or no. We never see your name, photo or passport number.">
        <div className="row">
          <a className="btn" href="https://play.google.com/store/apps/details?id=com.proofofpassportapp" target="_blank" rel="noreferrer">Get Self for Android</a>
          <a className="btn btn-ghost" href="https://apps.apple.com/us/app/self-human-agent-identity/id6478563710" target="_blank" rel="noreferrer">Get Self for iPhone</a>
        </div>
      </PageHead>
      <section className="wrap" style={{ paddingBottom: 40 }}>
        <div className="numbered">
          {STEPS.map((s, i) => <Reveal key={s.t} delay={i * 0.05}><div><h3>{s.t}</h3><p>{s.d}</p></div></Reveal>)}
        </div>
      </section>
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap grid grid-3">
          <div className="card"><h3>Which ID works best?</h3><p className="muted" style={{ marginTop: 8 }}>A passport with a chip (the small camera-like symbol on the cover). Nigerian e-passports, UK, US and most modern passports have one. It gives the fastest, most reliable result.</p></div>
          <div className="card"><h3>If it won&apos;t read</h3><p className="muted" style={{ marginTop: 8 }}>Take the phone case off, keep the passport flat on a table, and move the phone slowly until it vibrates. Make sure NFC is on (Android). Good light helps the first camera step.</p></div>
          <div className="card"><h3>No passport?</h3><p className="muted" style={{ marginTop: 8 }}>A verified friend can buy for you. Each verified person can buy up to the organizer&apos;s limit per event (often 2–4), so one friend with a passport can get tickets for the group.</p></div>
        </div>
        <div className="wrap" style={{ marginTop: 26 }}>
          <Link href="/events" className="btn btn-lg">I&apos;m verified, find an event</Link>
        </div>
      </section>
    </>
  );
}
