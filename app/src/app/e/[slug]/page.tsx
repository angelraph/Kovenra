import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BuyPanel from "@/components/BuyPanel";
import { Scene, sceneFor } from "@/components/Scene";
import { publicEvent, soldOf } from "@/lib/api";
import { ensureDraw } from "@/lib/drop";
import { fromUnits } from "@/lib/chain";
import { eventDate } from "@/lib/format";
import { liveRate, priceFor } from "@/lib/purchase";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const store = getStore();
  const found = await store.getEventBySlug(slug);
  if (!found) return null;
  const e = await ensureDraw(found, store).catch(() => found);
  const all = await store.listTickets(e.id);
  const entries = e.mode === "fair-drop" ? (await store.listEntries(e.id)).length : undefined;
  let priceUsdt: string | null = null;
  try {
    priceUsdt = fromUnits((await priceFor(e, await liveRate())).usdt, 6, 6);
  } catch {}
  return { ...publicEvent(e, soldOf(all), entries), priceUsdt, listed: all.filter((t) => t.status === "listed").length };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await load((await params).slug);
  return e ? { title: e.title, description: `${eventDate(e.startsAt)} at ${e.venue}, ${e.city}. ${e.priceLabel}. Fair tickets for real people.` } : {};
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await load((await params).slug);
  if (!e) notFound();
  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 90 }}>
      <div className="crumbs"><Link href="/">Home</Link><span>/</span><Link href="/events">Events</Link><span>/</span><span>{e.title}</span></div>
      <div className="scene" style={{ aspectRatio: "21/8", marginTop: 18, borderRadius: 26 }}>
        <Scene kind={sceneFor(e.title)} seed={e.title.length + 1} className="art" />
      </div>
      <div className="feature-row" style={{ alignItems: "start", marginTop: 30, gap: 40 }}>
        <div className="stack">
          <div className="ev-date">{eventDate(e.startsAt)}</div>
          <h1 style={{ fontSize: "clamp(34px,6vw,58px)" }}>{e.title}</h1>
          <p className="muted">{e.venue}, {e.city} · by {e.organizerName}</p>
          <div className="row" style={{ gap: 6 }}>
            {e.humansOnly && <span className="pill pill-good"><span className="dot" /> Verified humans only</span>}
            <span className="pill">{e.perPersonLimit} per person</span>
            {e.minAge > 0 && <span className="pill">{e.minAge}+</span>}
            <span className="pill">{e.sold} of {e.capacity} sold</span>
            {e.mode === "fair-drop" && <span className="pill pill-gold">Fair drop · {e.drop?.entries ?? 0} entered</span>}
          </div>
          <div className="bar"><span style={{ width: `${Math.min(100, (e.sold / e.capacity) * 100)}%` }} /></div>
          {e.description && <p style={{ whiteSpace: "pre-wrap", marginTop: 16, color: "#d4d4d8" }}>{e.description}</p>}
          <div className="card card-tight small muted" style={{ marginTop: 20 }}>
            {e.mode === "fair-drop"
              ? "Fair drop: verified people enter the draw, one entry each. When entries close, a Celo block picks the winners, and anyone can check the result. No bots, no fastest-finger race."
              : e.humansOnly
                ? "Every ticket goes to a real, unique person. Bots and duplicate accounts can't buy. If someone can't go, they hand the ticket back and it's resold at face value, never more."
                : "Pay in USD₮ or cNGN. Your ticket is a QR code that works once at the door."}
          </div>
          <Link href={`/e/${e.slug}/fair`} className="link-arrow" style={{ marginTop: 6 }}>See this event&apos;s fairness report →</Link>
        </div>
        <BuyPanel
          slug={e.slug}
          priceLabel={e.priceLabel}
          priceUsdt={e.priceUsdt}
          remaining={e.remaining}
          humansOnly={e.humansOnly}
          minAge={e.minAge}
          perPersonLimit={e.perPersonLimit}
          listed={e.listed}
          drop={e.drop ? { phase: e.drop.phase, entryClosesAt: e.drop.entryClosesAt, claimMinutes: e.drop.claimMinutes, drawAt: e.drop.drawAt ?? null, entries: e.drop.entries ?? 0 } : null}
        />
      </div>
    </div>
  );
}
