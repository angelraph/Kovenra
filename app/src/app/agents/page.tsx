import Link from "next/link";

export const metadata = { title: "Agent API · Kovenra" };

export default function Agents() {
  return (
    <div className="wrap narrow section stack">
      <h2>Kovenra for AI agents</h2>
      <p className="muted">
        Agents can buy tickets for the people they work for. Kovenra only serves agents with a verified human behind them
        (Self Agent ID on Celo), and one person&apos;s agents share one limit. Payment is over x402, in USD₮ or cNGN, through
        Celo&apos;s own facilitator.
      </p>
      <div className="card stack">
        <h3>What happens on each request</h3>
        <div className="steps stack">
          <div className="step"><b>Identity.</b> <span className="muted">We check the Self Agent ID signature over the exact request body against the registry on Celo. No verified human means a 403. Bots never reach the payment step.</span></div>
          <div className="step"><b>Fairness.</b> <span className="muted">We hold a seat against the human&apos;s nullifier, which is the same for all of their agents, so a second agent from the same person hits the same limit (429).</span></div>
          <div className="step"><b>Payment.</b> <span className="muted">A 402 offers USD₮ (gasless) or cNGN. We settle on-chain before writing the ticket.</span></div>
          <div className="step"><b>Naira for the organizer.</b> <span className="muted">USD₮ is converted on Textile FX and sent to the organizer as cNGN. Every transaction is ERC-8021 tagged.</span></div>
        </div>
      </div>
      <pre className="code">{`GET  /api/events
GET  /api/events/{slug}
POST /api/events/{slug}/buy      ← Self Agent ID + x402
GET  /api/tickets/{id}
GET  /api/proof                  ← every sale with tx hashes`}</pre>
      <div className="row">
        <a className="btn btn-sm" href="/skill.md">Agent skill file</a>
        <Link className="btn btn-ghost btn-sm" href="/proof">On-chain proof</Link>
        <a className="btn btn-ghost btn-sm" href="https://docs.self.xyz/agent-id/quickstart" target="_blank" rel="noreferrer">Get a Self Agent ID</a>
      </div>
    </div>
  );
}
