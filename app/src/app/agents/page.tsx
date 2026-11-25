import Link from "next/link";
import AgentDemo from "@/components/home/AgentDemo";
import PageHead from "@/components/PageHead";
import { Reveal } from "@/components/motion";

export const metadata = { title: "For AI agents", description: "Let an AI agent buy a ticket for you. Kovenra serves agents with a verified human behind them and takes payment over x402." };

export default function Agents() {
  return (
    <>
      <PageHead crumb="For AI agents" eyebrow="For AI agents" title="Agents can buy tickets too. Bots can't." lead="If your agent carries a Self Agent ID that links it to you, it can find an event, pay, and bring your ticket back. If it doesn't, it gets turned away before any money moves.">
        <div className="row"><a className="btn btn-lg" href="/skill.md">Open skill.md</a><a className="btn btn-ghost btn-lg" href="https://docs.self.xyz/agent-id/quickstart" target="_blank" rel="noreferrer">Get a Self Agent ID</a></div>
      </PageHead>

      <section className="wrap agent-wrap" style={{ paddingBottom: 40 }}>
        <div>
          <Reveal>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,38px)" }}>What happens on each request</h2>
            <div className="numbered" style={{ marginTop: 22 }}>
              <div><h3>Who&apos;s asking?</h3><p>We check the Self Agent ID signature over the exact request against the registry on Celo. No verified human behind it means a 403. Bots never reach the payment step.</p></div>
              <div><h3>Is it fair?</h3><p>We hold a seat against the person&apos;s anonymous Self number, which is the same for all of their agents. A second agent from the same person hits the same limit and gets a 429.</p></div>
              <div><h3>Pay</h3><p>A 402 offers USD₮ (gasless) or cNGN. We settle it on-chain through Celo&apos;s facilitator before writing the ticket.</p></div>
              <div><h3>Naira for the organizer</h3><p>USD₮ is converted on Textile FX and sent to the organizer as cNGN. Every transaction carries our ERC-8021 tag.</p></div>
            </div>
          </Reveal>
        </div>
        <Reveal y={30}><AgentDemo /></Reveal>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal><h2 style={{ fontSize: "clamp(26px,3.4vw,38px)" }}>Endpoints</h2></Reveal>
          <Reveal delay={0.05}>
            <pre className="code" style={{ marginTop: 18 }}>{`GET  /api/events                 list upcoming events
GET  /api/events/{slug}          one event, with the live USD₮ price
POST /api/events/{slug}/buy      Self Agent ID signature + x402 payment
GET  /api/tickets/{id}           read a ticket back
GET  /api/proof                  every sale with its transactions
GET  /api/rate                   live USD₮ → naira rate (Textile FX)
GET  /api/stats                  live totals`}</pre>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="row" style={{ marginTop: 22 }}>
              <Link className="btn btn-ghost" href="/proof">Live proof</Link>
              <a className="btn btn-ghost" href="https://github.com/angelraph/Kovenra" target="_blank" rel="noreferrer">Source on GitHub</a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
