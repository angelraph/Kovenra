import Link from "next/link";
import { eventDate } from "@/lib/format";
import { Scene, sceneFor } from "./Scene";

export type PublicEvent = {
  slug: string; title: string; venue: string; city: string; startsAt: string; priceLabel: string;
  capacity: number; sold: number; remaining: number; perPersonLimit: number; minAge: number; humansOnly: boolean;
};

export default function EventCard({ e, i = 0 }: { e: PublicEvent; i?: number }) {
  return (
    <Link href={`/e/${e.slug}`} className="card ev">
      <div className="ev-art"><Scene kind={sceneFor(e.title)} seed={i + e.title.length} /></div>
      <div className="ev-body">
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
      </div>
    </Link>
  );
}
