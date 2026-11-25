import Link from "next/link";
import { Logo } from "./brand";
import { Github, XLogo } from "./icons";
import { ChainStatus } from "./live";

const COLS: { h: string; links: { href: string; label: string; badge?: string; ext?: boolean }[] }[] = [
  { h: "Product", links: [
    { href: "/events", label: "Events" },
    { href: "/new", label: "List an event" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/proof", label: "Live proof", badge: "Live" },
  ] },
  { h: "Solutions", links: [
    { href: "/organizers", label: "For organizers" },
    { href: "/fans", label: "For fans" },
    { href: "/agents", label: "For AI agents", badge: "New" },
    { href: "/skill.md", label: "Agent skill file", ext: true },
  ] },
  { h: "Company", links: [
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
    { href: "/brand", label: "Brand" },
    { href: "/contact", label: "Contact" },
  ] },
  { h: "Legal", links: [
    { href: "/trust", label: "Trust & safety" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ] },
];

export default function SiteFooter() {
  return (
    <>
      <div className="curtain" aria-hidden />
      <footer className="footer">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <Logo size={30} />
              <p className="muted" style={{ marginTop: 16, maxWidth: 320, fontSize: 14.5 }}>
                Fair tickets for real people across Nigeria. One verified person, one seat. Paid in naira, on Celo.
              </p>
              <div className="socials">
                <a href="https://github.com/angelraph/Kovenra" target="_blank" rel="noreferrer" aria-label="Kovenra on GitHub"><Github /></a>
                <a href="https://x.com/Celo" target="_blank" rel="noreferrer" aria-label="Celo on X"><XLogo /></a>
              </div>
            </div>
            {COLS.map((c) => (
              <div className="foot-col" key={c.h}>
                <h5>{c.h}</h5>
                {c.links.map((l) =>
                  l.ext ? (
                    <a key={l.href} href={l.href}>{l.label}</a>
                  ) : (
                    <Link key={l.href} href={l.href}>
                      {l.label} {l.badge && <span className={`badge ${l.badge === "Live" ? "badge-gold" : ""}`}>{l.badge}</span>}
                    </Link>
                  ),
                )}
              </div>
            ))}
          </div>
          <div className="foot-bar">
            <span>© {new Date().getFullYear()} Kovenra. Built on Celo with Self, Textile FX and x402. Photos from <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a>.</span>
            <ChainStatus />
          </div>
        </div>
        <div className="giant" aria-hidden>Kovenra</div>
      </footer>
    </>
  );
}
