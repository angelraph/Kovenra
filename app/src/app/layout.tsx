import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Inter_Tight({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Kovenra · Fair tickets, paid in naira",
  description:
    "Sell event tickets to real people, not bots. One ticket per verified person, pay in dollars or naira, and the organizer gets naira on Celo in seconds.",
  metadataBase: new URL(process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"),
  openGraph: { title: "Kovenra", description: "Fair tickets for real people. Paid in naira, on Celo." },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0d10",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>
        <header className="topbar">
          <div className="wrap topbar-in">
            <Link href="/" className="brand" aria-label="Kovenra home">
              <span className="brand-mark" aria-hidden>
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V9a3 3 0 0 0 0 6v2.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5V15a3 3 0 0 0 0-6Z" fill="currentColor" />
                  <path d="M9.2 12.3l1.9 1.9 3.8-4.1" stroke="var(--bg)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Kovenra
            </Link>
            <nav className="nav">
              <Link href="/#events">Events</Link>
              <Link href="/agents">For agents</Link>
              <Link href="/proof">Proof</Link>
              <Link href="/new" className="btn btn-sm">Sell tickets</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="wrap footer-in">
            <span>Kovenra runs on Celo mainnet. Tickets are paid over x402, buyers are checked with Self Agent ID, and naira settles through Textile FX.</span>
            <span className="muted">
              <Link href="/proof">On-chain proof</Link> · <Link href="/agents">Agent API</Link> · <a href="https://github.com/angelraph/Kovenra">Source</a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
