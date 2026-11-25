import Link from "next/link";
import FaqList from "@/components/FaqList";
import PageHead from "@/components/PageHead";

export const metadata = { title: "FAQ", description: "Answers about buying, selling, naira payouts, privacy and AI agents on Kovenra." };

export default function Faq() {
  return (
    <>
      <PageHead crumb="FAQ" eyebrow="Help" title="Frequently asked questions" lead="Buying, selling, getting paid, privacy and agents. If your question isn't here, just ask." />
      <section className="wrap faq" style={{ paddingBottom: 90 }}>
        <div className="faq-head">
          <h2 style={{ fontSize: "clamp(26px,3vw,36px)" }}>Still stuck?</h2>
          <p className="muted" style={{ marginTop: 12, maxWidth: 340 }}>Send us a message and a real person will get back to you.</p>
          <Link href="/contact" className="btn btn-ghost" style={{ marginTop: 20 }}>Contact us</Link>
        </div>
        <FaqList />
      </section>
    </>
  );
}
