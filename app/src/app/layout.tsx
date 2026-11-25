import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { LiveProvider } from "@/components/live";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const sans = Inter_Tight({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const display = Plus_Jakarta_Sans({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

const base = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: "Kovenra · Fair tickets for real people, paid in naira", template: "%s · Kovenra" },
  description:
    "Sell event tickets to real people, not bots. One ticket per verified person, pay in dollars or naira, and the organizer gets naira on Celo in seconds.",
  applicationName: "Kovenra",
  openGraph: {
    type: "website",
    siteName: "Kovenra",
    title: "Kovenra · Fair tickets for real people",
    description: "One verified person, one seat. Paid in naira, on Celo.",
  },
  twitter: { card: "summary_large_image", title: "Kovenra · Fair tickets for real people", description: "One verified person, one seat. Paid in naira, on Celo." },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} ${mono.variable}`}>
        <LiveProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </LiveProvider>
      </body>
    </html>
  );
}
