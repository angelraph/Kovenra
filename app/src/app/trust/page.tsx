import Link from "next/link";
import PageHead from "@/components/PageHead";
import { Lock, Shield, Wallet } from "@/components/icons";
import { Reveal } from "@/components/motion";

export const metadata = { title: "Trust & safety", description: "How Kovenra protects your privacy, keeps drops fair and handles money." };

export default function Trust() {
  return (
    <>
      <PageHead crumb="Trust & safety" eyebrow="Trust & safety" title="Private, fair, and easy to check" lead="Here's what we know about you, what we don't, and how you can check every payment yourself." />
      <section className="wrap" style={{ paddingBottom: 40 }}>
        <div className="grid grid-3">
          {[
            [<Lock key="l" size={22} />, "Your privacy", "Self reads your passport on your phone. We get a proof that you're a real, unique person (and over 18 if needed). Never your name, photo, passport number or birthday."],
            [<Shield key="s" size={22} />, "Fair drops", "Limits are per person, not per account. Unverified requests are refused before payment. Seats are held while you pay so nobody gets charged for a sold-out show."],
            [<Wallet key="w" size={22} />, "Your money", "Payments settle on Celo before a ticket is issued. Organizers get naira in seconds. Every step is a public transaction you can look up."],
          ].map(([icon, t, d], i) => (
            <Reveal key={t as string} delay={i * 0.06}>
              <div className="card" style={{ height: "100%", padding: 26 }}>
                <span className="gold">{icon}</span>
                <h3 style={{ marginTop: 16 }}>{t as string}</h3>
                <p className="muted" style={{ marginTop: 8 }}>{d as string}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="prose">
            <h2>What we store</h2>
            <ul>
              <li>An anonymous number from Self that stays the same each time you buy. It lets us count one ticket per person. It can&apos;t be turned back into your identity.</li>
              <li>Your wallet address and the payment transaction.</li>
              <li>Your ticket and whether it has been scanned.</li>
              <li>For blocked attempts: the reason and the time, so organizers can see how many bots were stopped.</li>
            </ul>
            <h2>What we never store</h2>
            <ul>
              <li>Your name, photo, passport number, nationality or date of birth.</li>
              <li>Card or bank details. Kovenra doesn&apos;t take cards.</li>
            </ul>
            <h2>Check it yourself</h2>
            <p>The <Link href="/proof">Live proof</Link> page lists every sale with links to the payment, the naira conversion and the payout on Celoscan. The code is open on <a href="https://github.com/angelraph/Kovenra" target="_blank" rel="noreferrer">GitHub</a>.</p>
            <h2>Something wrong?</h2>
            <p>If you think a ticket or an event isn&apos;t right, <Link href="/contact">tell us</Link>. We read everything.</p>
          </div>
        </div>
      </section>
    </>
  );
}
