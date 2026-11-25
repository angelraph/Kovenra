import Link from "next/link";
import PageHead from "@/components/PageHead";

export const metadata = { title: "Privacy", description: "What Kovenra collects, and what it never does." };

export default function Privacy() {
  return (
    <>
      <PageHead crumb="Privacy" eyebrow="Legal" title="Privacy policy" lead="Short version: we don't know who you are, and we like it that way. Last updated November 2026." />
      <section className="wrap" style={{ paddingBottom: 90 }}>
        <div className="prose">
          <h2>Identity</h2>
          <p>We use Self to check that a buyer is a real, unique person. Self reads your passport on your own phone and shares only a proof with us. We never receive your name, photo, passport number, nationality or date of birth.</p>
          <h2>What we keep</h2>
          <ul>
            <li>An anonymous identifier from Self, so we can count one ticket per person.</li>
            <li>Your wallet address and payment transactions. These are public on the blockchain anyway.</li>
            <li>Your tickets and whether they&apos;ve been scanned.</li>
            <li>Organizer details you type in: event info, organizer name and payout wallet.</li>
          </ul>
          <h2>What we don&apos;t do</h2>
          <ul>
            <li>We don&apos;t sell or share your data with advertisers.</li>
            <li>We don&apos;t use tracking cookies or ad pixels.</li>
            <li>We don&apos;t show organizers who you are.</li>
          </ul>
          <h2>Your browser</h2>
          <p>We save a few small things on your own device, like your organizer dashboard key and your Self agent key, so you don&apos;t have to set them up again. You can clear them any time by clearing your browser&apos;s site data.</p>
          <h2>Questions</h2>
          <p>Ask us anything through the <Link href="/contact">contact page</Link>.</p>
        </div>
      </section>
    </>
  );
}
