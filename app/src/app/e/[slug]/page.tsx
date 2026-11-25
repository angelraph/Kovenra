import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BuyPanel from "@/components/BuyPanel";
import { publicEvent } from "@/lib/api";
import { fromUnits } from "@/lib/chain";
import { eventDate } from "@/lib/format";
import { liveRate, priceFor } from "@/lib/purchase";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const store = getStore();
  const e = await store.getEventBySlug(slug);
  if (!e) return null;
  const sold = (await store.listTickets(e.id)).length;
  let priceUsdt: string | null = null;
  try {
    priceUsdt = fromUnits((await priceFor(e, await liveRate())).usdt, 6, 6);
  } catch {}
  return { ...publicEvent(e, sold), priceUsdt };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await load((await params).slug);
  return e ? { title: `${e.title} · Kovenra`, description: `${eventDate(e.startsAt)} at ${e.venue}. ${e.priceLabel}. Tickets for real people.` } : {};
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await load((await params).slug);
  if (!e) notFound();
  return (
    <div className="wrap section">
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="stack">
          <div className="ev-date">{eventDate(e.startsAt)}</div>
          <h1 style={{ fontSize: "clamp(30px,6vw,46px)" }}>{e.title}</h1>
          <p className="muted">{e.venue}, {e.city} · by {e.organizerName}</p>
          <div className="row" style={{ gap: 6 }}>
            {e.humansOnly && <span className="pill pill-good"><span className="dot" /> Verified humans only</span>}
            <span className="pill">{e.perPersonLimit} per person</span>
            {e.minAge > 0 && <span className="pill">{e.minAge}+</span>}
            <span className="pill">{e.sold} of {e.capacity} sold</span>
          </div>
          {e.description && <p style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>{e.description}</p>}
          <div className="card card-tight small muted" style={{ marginTop: 20 }}>
            {e.humansOnly
              ? "Fair drop: every ticket goes to a real, unique person. Bots and duplicate accounts can't buy, so there's no reselling at triple the price."
              : "Pay in USD₮ or cNGN. Your ticket is a QR code that works once at the door."}
          </div>
        </div>
        <BuyPanel
          slug={e.slug}
          priceLabel={e.priceLabel}
          priceUsdt={e.priceUsdt}
          remaining={e.remaining}
          humansOnly={e.humansOnly}
          minAge={e.minAge}
          perPersonLimit={e.perPersonLimit}
        />
      </div>
    </div>
  );
}
