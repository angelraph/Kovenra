import Link from "next/link";
import AgentDemo from "@/components/home/AgentDemo";
import PageHead from "@/components/PageHead";
import { Reveal } from "@/components/motion";
import { Arrow } from "@/components/icons";
import { SELF_REGISTRY } from "@/lib/chain";
import { env } from "@/lib/env";
import { findAgentId, IDENTITY_REGISTRY } from "@/lib/erc8004";

export const dynamic = "force-dynamic";
export const metadata = { title: "For AI agents", description: "Let an AI agent buy a ticket for you. Kovenra serves agents with a verified human behind them and takes payment over x402." };

export default async function Agents() {
  const erc8004Id = await findAgentId().catch(() => null);
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

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <Reveal>
            <div className="hair hair-3">
              <div>
                <span className="eyebrow">Kovenra&apos;s own identity</span>
                <div className="big-num" style={{ marginTop: 14 }}>{erc8004Id ? `#${erc8004Id}` : "Pending"}</div>
                <p className="small faint" style={{ marginTop: 8 }}>ERC-8004 agent in the official Identity Registry on Celo mainnet{env.agentId ? `, and Self Agent ID #${env.agentId}` : ""}.</p>
                {erc8004Id && <a className="cell-title" href={`https://8004scan.io/agents/celo/${erc8004Id}`} target="_blank" rel="noreferrer">See it on 8004scan <Arrow size={16} /></a>}
              </div>
              <div>
                <span className="eyebrow">Registration document</span>
                <p className="muted" style={{ marginTop: 14 }}>Name, services, skills, x402 payment options and registry entry, in the ERC-8004 format.</p>
                <a className="cell-title" href="/.well-known/agent-registration.json">agent-registration.json <Arrow size={16} /></a>
              </div>
              <div>
                <span className="eyebrow">Registries</span>
                <p className="muted mono small" style={{ marginTop: 14, wordBreak: "break-all" }}>ERC-8004 · {IDENTITY_REGISTRY}<br />Self Agent ID · {SELF_REGISTRY}</p>
                <a className="cell-title" href={env.agentAddress ? `https://celoscan.io/address/${env.agentAddress}` : `https://celoscan.io/address/${SELF_REGISTRY}`} target="_blank" rel="noreferrer">See it on Celoscan <Arrow size={16} /></a>
              </div>
            </div>
          </Reveal>
        </div>
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
GET  /api/stats                  live totals
GET  /.well-known/agent-registration.json   Kovenra's ERC-8004 document
GET  /skill.md                   step-by-step guide for agents`}</pre>
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
