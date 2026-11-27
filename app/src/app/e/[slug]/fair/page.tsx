import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check, Shield } from "@/components/icons";
import { ensureDraw } from "@/lib/drop";
import { eventDate, naira, usd } from "@/lib/format";
import { fairnessReport } from "@/lib/report";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const store = getStore();
  const found = await store.getEventBySlug(slug);
  if (!found) return null;
  const e = await ensureDraw(found, store).catch(() => found);
  return fairnessReport(e, store);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await load((await params).slug);
  return r ? { title: `Fairness report · ${r.event.title}`, description: `${r.totals.ticketsSold} tickets to ${r.totals.uniqueBuyers} ${r.totals.countedBy === "human" ? "verified people" : "different buyers"}, ${r.totals.botsBlocked} bots turned away, 0 resales above face value.` } : {};
}

const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

export default async function FairPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await load(slug);
  if (!r) notFound();
  const t = r.totals;

  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <div className="crumbs"><Link href="/">Home</Link><span>/</span><Link href={`/e/${slug}`}>{r.event.title}</Link><span>/</span><span>Fairness report</span></div>
          <span className="eyebrow" style={{ marginTop: 26 }}>Fairness report</span>
          <h1>{r.event.title}</h1>
          <p className="lead">{eventDate(r.event.startsAt)} · {r.event.venue}, {r.event.city} · {r.event.priceLabel}. Every number below comes from Kovenra&apos;s records and Celo mainnet, live.</p>
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: 30 }}>
        <div className="hair hair-3">
          <div><span className="eyebrow">Tickets sold</span><div className="big-num" style={{ marginTop: 14 }}>{t.ticketsSold}<span className="faint" style={{ fontSize: "0.4em" }}> / {r.event.capacity}</span></div><p className="small faint" style={{ marginTop: 8 }}>{t.countedBy === "human" ? <>to {t.uniqueBuyers} verified {t.uniqueBuyers === 1 ? "person" : "people"}</> : <>to {t.uniqueBuyers} different {t.uniqueBuyers === 1 ? "wallet" : "wallets"}</>}</p></div>
          <div><span className="eyebrow">{t.countedBy === "human" ? "Most tickets one person got" : "Most tickets one wallet got"}</span><div className="big-num" style={{ marginTop: 14 }}>{t.maxTicketsOneBuyer}</div><p className="small faint" style={{ marginTop: 8 }}>{t.countedBy === "human" ? <>limit was {r.event.perPersonLimit}, counted per human across all their agents</> : <>This event doesn&apos;t ask buyers to verify who they are, so we count paying wallets.</>}</p></div>
          <div><span className="eyebrow">Bots turned away</span><div className="big-num goldtext" style={{ marginTop: 14 }}>{t.botsBlocked}</div><p className="small faint" style={{ marginTop: 8 }}>before any money moved</p></div>
          <div><span className="eyebrow">Resold above face value</span><div className="big-num" style={{ marginTop: 14 }}>0</div><p className="small faint" style={{ marginTop: 8 }}>{t.resales} {t.resales === 1 ? "ticket" : "tickets"} changed hands, all at face value</p></div>
          <div><span className="eyebrow">Paid to the organizer</span><div className="big-num" style={{ marginTop: 14 }}>{t.ngnPaidLabel}</div><p className="small faint" style={{ marginTop: 8 }}>in naira (cNGN), seconds after each sale</p></div>
          <div><span className="eyebrow">Checked in</span><div className="big-num" style={{ marginTop: 14 }}>{t.checkedIn}</div><p className="small faint" style={{ marginTop: 8 }}>each QR works once</p></div>
        </div>
      </section>

      {r.blocked.length > 0 && (
        <section className="wrap" style={{ paddingBottom: 30 }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,32px)" }}>Who was turned away, and why</h2>
          <div className="list" style={{ marginTop: 16 }}>
            {r.blocked.map((b) => (
              <div className="list-row" key={b.reason}><span className="row" style={{ gap: 8 }}><Shield size={15} className="gold" /> {b.label}</span><b>{b.count}</b></div>
            ))}
          </div>
        </section>
      )}

      {r.drop && (
        <section className="wrap" style={{ paddingBottom: 30 }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,32px)" }}>The fair drop draw</h2>
          <p className="muted" style={{ marginTop: 8, maxWidth: 760 }}>
            {r.drop.entries} verified {r.drop.entries === 1 ? "person has" : "people have"} entered, one entry each.{" "}
            {r.drop.drawSeed
              ? "Winners were picked by a Celo block that didn't exist yet when entries closed, so nobody (not even Kovenra) could choose them."
              : "Winners will be picked by the first Celo block after entries close. That block doesn't exist yet, so nobody (not even Kovenra) can choose them."}
          </p>
          <div className="card stack" style={{ marginTop: 16 }}>
            <div className="row between"><span className="muted">{r.drop.phase === "entries" ? "Entries close" : "Entries closed"}</span><span>{eventDate(r.drop.entryClosesAt)}</span></div>
            <div className="row between"><span className="muted">Draw block</span>{r.drop.drawBlock ? <a className="mono gold" href={`https://celoscan.io/block/${r.drop.drawBlock}`} target="_blank" rel="noreferrer">#{Number(r.drop.drawBlock).toLocaleString("en-US")} ↗</a> : <span className="muted">Waiting for entries to close</span>}</div>
            {r.drop.drawSeed && <div className="row between"><span className="muted">Block hash (the seed)</span><span className="mono small break">{r.drop.drawSeed}</span></div>}
            <div className="row between"><span className="muted">Winners</span><span>{r.drop.winners} · {r.drop.winnersWhoBought} bought</span></div>
            <div className="small faint">How to check: {r.drop.method}. The full list is at <a className="gold" href={`/api/events/${slug}/draw`}>/api/events/{slug}/draw</a>.</div>
          </div>
          {r.drop.order.length > 0 && (
            <div className="list" style={{ marginTop: 14, maxHeight: 360, overflowY: "auto" }}>
              {r.drop.order.slice(0, 200).map((o) => (
                <div className="list-row" key={o.entry}><span className="mono small">#{o.place} · {short(o.entry)}</span>{o.winner ? <span className="pill pill-good"><Check size={12} /> Won</span> : <span className="small faint">Waitlist</span>}</div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="wrap" style={{ paddingBottom: 90 }}>
        <h2 style={{ fontSize: "clamp(24px,3vw,32px)" }}>Every transaction</h2>
        <div className="list" style={{ marginTop: 16 }}>
          {r.transactions.length === 0 && <div className="list-row muted">No sales yet. Each one will appear here with its Celoscan links.</div>}
          {r.transactions.map((x) => (
            <div className="list-row" key={x.payment}>
              <span className="small muted">{new Date(x.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}{x.resale ? " · face-value resale" : ""}</span>
              <span className="small">{x.token === "USDT" ? `${usd(x.amount)} USD₮` : `${naira(x.amount)} cNGN`}</span>
              <span className="small">
                <a className="gold" href={`https://celoscan.io/tx/${x.payment}`} target="_blank" rel="noreferrer">payment ↗</a>
                {x.conversion && <> · <a className="gold" href={`https://celoscan.io/tx/${x.conversion}`} target="_blank" rel="noreferrer">naira conversion ↗</a></>}
                {x.payout && <> · <a className="gold" href={`https://celoscan.io/tx/${x.payout}`} target="_blank" rel="noreferrer">{x.resale ? "seller refund" : "organizer payout"} ↗</a></>}
              </span>
            </div>
          ))}
        </div>
        <p className="small faint" style={{ marginTop: 14 }}>Buyers stay anonymous. Kovenra only knows that each one is a real, unique person. Report generated {new Date(r.generatedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}.</p>
      </section>
    </>
  );
}
