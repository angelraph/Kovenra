import Link from "next/link";
import { publicEvent } from "@/lib/api";
import { eventDate } from "@/lib/format";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

async function upcoming() {
  try {
    const store = getStore();
    const events = await store.listEvents(60);
    const now = Date.now();
    const live = events.filter((e) => Date.parse(e.startsAt) > now - 6 * 3600_000);
    return Promise.all(live.map(async (e) => publicEvent(e, (await store.listTickets(e.id)).length)));
  } catch {
    return [];
  }
}

export default async function Home() {
  const events = await upcoming();
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <span className="pill pill-gold"><span className="dot" /> Live on Celo mainnet</span>
          <h1 style={{ marginTop: 18 }}>
            Tickets for <em>real people.</em>
            <br />Paid in naira.
          </h1>
          <p className="lead">
            Kovenra sells event tickets one per verified person, so scalper bots and fake accounts can&apos;t empty your show
            before the fans get there. Fans pay in dollars or naira from their phone, and the organizer gets naira in seconds.
          </p>
          <div className="row" style={{ marginTop: 26 }}>
            <Link href="/new" className="btn">Sell tickets in 60 seconds</Link>
            <Link href="#events" className="btn btn-ghost">Find an event</Link>
          </div>
          <div className="row" style={{ marginTop: 22, gap: 8 }}>
            <span className="pill">One ticket per person</span>
            <span className="pill">18+ checks without showing ID</span>
            <span className="pill">USD₮ in, naira out</span>
            <span className="pill">QR check-in at the door</span>
          </div>
        </div>
      </section>

      <section className="section" id="events">
        <div className="wrap">
          <div className="row between">
            <h2>Upcoming events</h2>
            <Link href="/new" className="muted small">List yours →</Link>
          </div>
          {events.length === 0 ? (
            <div className="card" style={{ marginTop: 18 }}>
              <h3>No events listed yet</h3>
              <p className="muted" style={{ marginTop: 6 }}>Be the first. It takes a minute and costs nothing to list.</p>
              <Link href="/new" className="btn btn-sm" style={{ marginTop: 14 }}>Create an event</Link>
            </div>
          ) : (
            <div className="grid grid-3" style={{ marginTop: 18 }}>
              {events.map((e) => (
                <Link key={e.slug} href={`/e/${e.slug}`} className="card ev">
                  <div className="ev-date">{eventDate(e.startsAt)}</div>
                  <div className="ev-title">{e.title}</div>
                  <div className="ev-meta">{e.venue}, {e.city}</div>
                  <div className="row between" style={{ marginTop: 14 }}>
                    <span className="price">{e.priceLabel}</span>
                    <span className="small muted">{e.remaining > 0 ? `${e.remaining} left` : "Sold out"}</span>
                  </div>
                  <div className="bar"><span style={{ width: `${Math.min(100, (e.sold / e.capacity) * 100)}%` }} /></div>
                  <div className="row" style={{ marginTop: 12, gap: 6 }}>
                    {e.humansOnly && <span className="pill pill-good">Verified humans</span>}
                    {e.minAge > 0 && <span className="pill">{e.minAge}+</span>}
                    <span className="pill">{e.perPersonLimit} per person</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="wrap grid grid-2">
          <div className="card stack steps">
            <h3>For fans</h3>
            <div className="step"><b>Verify once.</b> <span className="muted">Scan your passport in the free Self app. Kovenra never sees your name or your passport, only proof that you&apos;re a real, unique person.</span></div>
            <div className="step"><b>Pay in seconds.</b> <span className="muted">Pay in USD₮ from MiniPay or any wallet, or in cNGN. No card, no failed transfers.</span></div>
            <div className="step"><b>Walk in.</b> <span className="muted">Your ticket is a QR code on your phone. It works once, so it can&apos;t be copied or resold.</span></div>
          </div>
          <div className="card stack steps">
            <h3>For organizers</h3>
            <div className="step"><b>List your event.</b> <span className="muted">Set a naira price, the number of seats, and how many tickets each person can buy.</span></div>
            <div className="step"><b>Get naira automatically.</b> <span className="muted">Dollar payments are converted on Textile FX and land in your wallet as cNGN. You can cash out to any Nigerian bank.</span></div>
            <div className="step"><b>Scan at the door.</b> <span className="muted">Open the scanner on your phone. Used and fake tickets are flagged right away.</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap card">
          <div className="grid grid-2" style={{ alignItems: "center" }}>
            <div>
              <h2>AI agents can buy too</h2>
              <p className="muted" style={{ marginTop: 10 }}>
                Tell your agent &quot;get me two tickets when they drop.&quot; Kovenra serves agents that have a verified human behind them
                (Self Agent ID) and takes payment over x402. All of one person&apos;s agents share one limit, so nobody can run a
                hundred bots to clear the show.
              </p>
              <Link href="/agents" className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>Read the agent API</Link>
            </div>
            <pre className="code">{`POST /api/events/{slug}/buy
x-self-agent-signature: 0x…   ← verified human
PAYMENT-SIGNATURE: …          ← x402, USD₮ or cNGN

200 { ticket: { id, code, url } }
403 human_verification_required
429 per_person_limit`}</pre>
          </div>
        </div>
      </section>
    </>
  );
}
