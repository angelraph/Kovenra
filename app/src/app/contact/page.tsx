import Link from "next/link";
import PageHead from "@/components/PageHead";
import { Github, XLogo } from "@/components/icons";
import { Reveal } from "@/components/motion";

export const metadata = { title: "Contact", description: "Get in touch with the Kovenra team." };

export default function Contact() {
  return (
    <>
      <PageHead crumb="Contact" eyebrow="Contact" title="Talk to us" lead="Organizer with a question, fan with a problem, or a builder who wants to plug in? Here's where to reach us." />
      <section className="wrap" style={{ paddingBottom: 90 }}>
        <div className="grid grid-3">
          <Reveal>
            <a className="card" href="https://github.com/angelraph/Kovenra/issues/new" target="_blank" rel="noreferrer" style={{ display: "block", height: "100%", padding: 26 }}>
              <Github size={24} />
              <h3 style={{ marginTop: 16 }}>Open an issue</h3>
              <p className="muted" style={{ marginTop: 8 }}>Bugs, ideas or questions about the code. We reply on GitHub.</p>
            </a>
          </Reveal>
          <Reveal delay={0.06}>
            <a className="card" href="https://x.com/RaphElevator" target="_blank" rel="noreferrer" style={{ display: "block", height: "100%", padding: 26 }}>
              <XLogo size={22} />
              <h3 style={{ marginTop: 16 }}>Find us on X</h3>
              <p className="muted" style={{ marginTop: 8 }}>Message the founder, @RaphElevator, for questions, partnerships or to list your event.</p>
            </a>
          </Reveal>
          <Reveal delay={0.12}>
            <Link className="card" href="/faq" style={{ display: "block", height: "100%", padding: 26 }}>
              <span className="gold" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22 }}>?</span>
              <h3 style={{ marginTop: 16 }}>Check the FAQ</h3>
              <p className="muted" style={{ marginTop: 8 }}>Most questions about buying, selling and getting paid are answered there.</p>
            </Link>
          </Reveal>
        </div>
        <p className="small faint" style={{ marginTop: 22 }}>Hosting an event and want help setting it up? Open an issue titled &quot;Organizer help&quot; and we&apos;ll walk you through it.</p>
      </section>
    </>
  );
}
