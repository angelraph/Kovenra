import Link from "next/link";
import EventCard from "@/components/EventCard";
import PageHead, { CtaBand } from "@/components/PageHead";
import { Reveal } from "@/components/motion";
import { publicEvent } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Events", description: "Upcoming events on Kovenra. Fair tickets for real people across Nigeria." };

async function upcoming() {
  try {
    const store = getStore();
    const events = await store.listEvents(200);
    const now = Date.now();
    const live = events.filter((e) => Date.parse(e.startsAt) > now - 6 * 3600_000).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    return Promise.all(live.map(async (e) => publicEvent(e, (await store.listTickets(e.id)).length)));
  } catch {
    return [];
  }
}

export default async function Events() {
  const events = await upcoming();
  const cities = [...new Set(events.map((e) => e.city))];
  return (
    <>
      <PageHead crumb="Events" eyebrow="Upcoming" title="Find your next night out" lead="Every ticket here goes to a real, unique person. No touts, no triple prices." >
        {cities.length > 1 && <div className="row" style={{ gap: 6 }}>{cities.map((c) => <span key={c} className="pill">{c}</span>)}</div>}
      </PageHead>
      <section className="wrap" style={{ paddingBottom: 60 }}>
        {events.length === 0 ? (
          <Reveal>
            <div className="empty">
              <h3>No events listed yet</h3>
              <p className="muted" style={{ marginTop: 8 }}>Be the first. It takes a minute and costs nothing to list.</p>
              <Link href="/new" className="btn" style={{ marginTop: 20 }}>List an event</Link>
            </div>
          </Reveal>
        ) : (
          <div className="grid grid-3">
            {events.map((e, i) => <Reveal key={e.slug} delay={(i % 3) * 0.06}><EventCard e={e} i={i} /></Reveal>)}
          </div>
        )}
      </section>
      <CtaBand title="Hosting something?" />
    </>
  );
}
