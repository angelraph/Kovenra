"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./brand";
import { Chevron, Menu, X } from "./icons";
import { ChainStatus, fmtNum, useLive } from "./live";

const SOLUTIONS = [
  { href: "/organizers", title: "For organizers", sub: "List a show, get naira in seconds" },
  { href: "/fans", title: "For fans", sub: "Verify once, buy fair, walk in" },
  { href: "/agents", title: "For AI agents", sub: "Buy for your human over x402" },
];
const LEARN = [
  { href: "/how-it-works", title: "How it works", sub: "The full flow, step by step" },
  { href: "/trust", title: "Trust & safety", sub: "Privacy, fairness and money" },
  { href: "/proof", title: "Live proof", sub: "Every sale with its transactions" },
];
const COMPANY = [
  { href: "/about", title: "About", sub: "Why Kovenra exists" },
  { href: "/brand", title: "Brand", sub: "Logo, colours and type" },
  { href: "/contact", title: "Contact", sub: "Talk to the team" },
];

export default function SiteHeader() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const [sheet, setSheet] = useState(false);
  const { rate, stats } = useLive();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    setMega(false);
    setSheet(false);
  }, [path]);
  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
  }, [sheet]);

  const link = (href: string, label: string) => (
    <Link href={href} className={`nav-link ${path === href ? "active" : ""}`}>{label}</Link>
  );

  return (
    <header className={`topbar ${scrolled || mega ? "scrolled" : ""}`} onMouseLeave={() => setMega(false)}>
      <div className="wrap topbar-in">
        <Link href="/" className="brand" aria-label="Kovenra home"><Logo size={24} /></Link>
        <nav className="nav" aria-label="Main">
          {link("/events", "Events")}
          <button className="nav-link" aria-expanded={mega} aria-haspopup="true" onMouseEnter={() => setMega(true)} onClick={() => setMega((m) => !m)}>
            Product <Chevron size={14} />
          </button>
          {link("/how-it-works", "How it works")}
          {link("/pricing", "Pricing")}
          {link("/faq", "FAQ")}
        </nav>
        <div className="nav-right">
          <Link href="/events" className="btn btn-ghost btn-sm hide-sm">Find events</Link>
          <Link href="/new" className="btn btn-sm">List an event</Link>
          <button className="burger" aria-label="Open menu" onClick={() => setSheet(true)}><Menu size={20} /></button>
        </div>
      </div>

      <AnimatePresence>
        {mega && (
          <motion.div className="mega" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="wrap mega-grid">
              {[["Solutions", SOLUTIONS], ["Learn", LEARN], ["Company", COMPANY]].map(([h, items]) => (
                <div className="mega-col" key={h as string}>
                  <h5>{h as string}</h5>
                  {(items as typeof SOLUTIONS).map((i) => (
                    <Link key={i.href} href={i.href}>{i.title}<span>{i.sub}</span></Link>
                  ))}
                </div>
              ))}
              <Link href="/proof" className="card" style={{ padding: 18, display: "block" }}>
                <div className="eyebrow">Live now</div>
                <div style={{ marginTop: 14 }}><ChainStatus compact /></div>
                <div className="kpis" style={{ marginTop: 16 }}>
                  <div className="kpi"><b>{rate ? `₦${fmtNum(rate, 0)}` : "—"}</b><span>per USD₮ (Textile)</span></div>
                  <div className="kpi"><b>{stats ? fmtNum(stats.botsBlocked) : "—"}</b><span>bots blocked</span></div>
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet && (
          <motion.div className="sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} role="dialog" aria-modal="true" aria-label="Menu">
            <div className="sheet-top">
              <Link href="/" aria-label="Kovenra home"><Logo size={24} /></Link>
              <div className="row" style={{ gap: 8 }}>
                <Link href="/new" className="btn btn-sm">List an event</Link>
                <button className="burger" aria-label="Close menu" onClick={() => setSheet(false)}><X size={20} /></button>
              </div>
            </div>
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05, duration: 0.3 }}>
              <div className="sheet-group">
                <h5>Explore</h5>
                <Link href="/events">Events</Link>
                <Link href="/how-it-works">How it works</Link>
                <Link href="/pricing">Pricing</Link>
                <Link href="/faq">FAQ</Link>
              </div>
              <div className="sheet-group">
                <h5>Solutions</h5>
                {SOLUTIONS.map((i) => <Link key={i.href} href={i.href}>{i.title}</Link>)}
              </div>
              <div className="sheet-group">
                <h5>Company</h5>
                {[...LEARN, ...COMPANY].map((i) => <Link key={i.href} href={i.href}>{i.title}</Link>)}
              </div>
            </motion.div>
            <div className="sheet-bottom">
              <ChainStatus compact />
              <Link href="/events" className="btn btn-ghost btn-block">Find events</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
