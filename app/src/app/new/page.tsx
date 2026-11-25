"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, Shield } from "@/components/icons";
import { fmtNum, useLive } from "@/components/live";
import { Scene, sceneFor } from "@/components/Scene";

interface Created {
  slug: string;
  adminKey: string;
  pageUrl: string;
  dashboardUrl: string;
}

export default function NewEvent() {
  const { rate } = useLive();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [created, setCreated] = useState<Created | null>(null);
  const [humansOnly, setHumansOnly] = useState(true);
  const [adult, setAdult] = useState(false);
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [price, setPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [perPerson, setPerPerson] = useState("1");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("20:00");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("title");
    if (t) setTitle(t.slice(0, 80));
  }, []);

  async function connectWallet(input: HTMLInputElement | null) {
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<string[]> } }).ethereum;
    if (!eth || !input) return alert("No wallet found. Paste your Celo wallet address instead.");
    const [addr] = await eth.request({ method: "eth_requestAccounts" });
    if (addr) input.value = addr;
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    const f = new FormData(e.currentTarget);
    const body = {
      title,
      description: f.get("description"),
      venue,
      city,
      startsAt: `${date}T${time || "20:00"}:00+01:00`, // Nigeria time (WAT)
      priceNaira: price.replace(/[,\s₦]/g, ""),
      capacity: Number(capacity),
      perPersonLimit: Number(perPerson),
      minAge: adult ? 18 : 0,
      humansOnly,
      organizerName: f.get("organizer"),
      payoutAddress: String(f.get("payout") ?? "").trim(),
    };
    try {
      const res = await fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) setErrors(json.issues ?? [json.message ?? "Something went wrong"]);
      else {
        setCreated(json);
        window.scrollTo({ top: 0, behavior: "smooth" });
        try {
          localStorage.setItem(`kovenra:admin:${json.slug}`, json.adminKey);
        } catch {}
      }
    } catch (err) {
      setErrors([(err as Error).message]);
    } finally {
      setBusy(false);
    }
  }

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  if (created) {
    const share = `https://wa.me/?text=${encodeURIComponent(`Get your ticket here: ${created.pageUrl}`)}`;
    return (
      <div className="wrap narrow section stack">
        <span className="pill pill-good"><span className="live-dot" style={{ width: 6, height: 6 }} /> Your event is live</span>
        <h1 style={{ fontSize: "clamp(36px,6vw,60px)", marginTop: 14 }}>You&apos;re selling tickets</h1>
        <p className="lead">Share your event link anywhere. Fans buy on their phone, and the naira goes to your wallet.</p>
        <div className="card stack" style={{ marginTop: 22 }}>
          <label>Event link (share this)</label>
          <div className="mono break">{created.pageUrl}</div>
          <div className="row">
            <a className="btn btn-sm" href={share} target="_blank" rel="noreferrer">Share on WhatsApp</a>
            <button className="btn btn-ghost btn-sm" onClick={() => copy(created.pageUrl, "page")}>{copied === "page" ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}</button>
            <Link className="btn btn-ghost btn-sm" href={`/e/${created.slug}`}>Open</Link>
          </div>
        </div>
        <div className="card stack" style={{ borderColor: "rgba(253,177,41,0.35)" }}>
          <label className="row" style={{ gap: 6 }}><Shield size={15} className="gold" /> Your private dashboard and door scanner</label>
          <p className="small muted">Keep this link to yourself. It shows your sales and opens the scanner. It&apos;s saved on this device too.</p>
          <div className="mono break small">{created.dashboardUrl}</div>
          <div className="row">
            <Link className="btn btn-sm" href={`/dashboard/${created.slug}#key=${created.adminKey}`}>Open dashboard</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => copy(created.dashboardUrl, "dash")}>{copied === "dash" ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy private link</>}</button>
          </div>
        </div>
      </div>
    );
  }

  const priceNum = Number(price.replace(/[,\s₦]/g, "")) || 0;
  const usd = rate && priceNum ? (priceNum / rate) * 1.006 : null;
  const when = date ? new Date(`${date}T${time || "20:00"}:00+01:00`).toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }) : "Pick a date";

  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <div className="crumbs"><Link href="/">Home</Link><span>/</span><span>List an event</span></div>
          <h1>List your event</h1>
          <p className="lead">Free to list, about a minute to fill. Fans pay in USD₮ or cNGN, and you receive naira (cNGN) in your wallet.</p>
        </div>
      </section>
      <div className="wrap" style={{ paddingBottom: 90 }}>
        <div className="feature-row" style={{ alignItems: "start" }}>
          <form onSubmit={submit} className="card" style={{ padding: "clamp(18px,3vw,30px)" }}>
            <div className="field">
              <label htmlFor="title">Event name</label>
              <input id="title" name="title" required placeholder="December Rooftop Jam" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="description">What&apos;s happening</label>
              <textarea id="description" name="description" placeholder="Live band, DJ till late, food on site." />
            </div>
            <div className="grid grid-2" style={{ marginTop: 16 }}>
              <div>
                <label htmlFor="venue">Venue</label>
                <input id="venue" name="venue" required placeholder="e.g. Civic Centre hall" value={venue} onChange={(e) => setVenue(e.target.value)} />
              </div>
              <div>
                <label htmlFor="city">City</label>
                <input id="city" name="city" required placeholder="e.g. Abuja, Ibadan, Port Harcourt" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label htmlFor="date">Date</label>
                <input id="date" name="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label htmlFor="time">Start time (Nigeria time)</label>
                <input id="time" name="time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div>
                <label htmlFor="price">Ticket price (₦)</label>
                <input id="price" name="price" inputMode="decimal" required placeholder="5000" value={price} onChange={(e) => setPrice(e.target.value)} />
                <div className="hint">{usd ? `About $${usd.toFixed(2)} USD₮ at today's live rate.` : "Fans can pay the dollar equivalent in USD₮."} Minimum about ₦1,500.</div>
              </div>
              <div>
                <label htmlFor="capacity">Number of tickets</label>
                <input id="capacity" name="capacity" type="number" min={1} required placeholder="150" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>
              <div>
                <label htmlFor="perPerson">Tickets per person</label>
                <select id="perPerson" name="perPerson" value={perPerson} onChange={(e) => setPerPerson(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="organizer">Organizer name</label>
                <input id="organizer" name="organizer" required placeholder="Your name or brand" />
              </div>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="payout">Your Celo wallet (where the naira goes)</label>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <input id="payout" name="payout" required placeholder="0x…" className="mono" />
                <button type="button" className="btn btn-ghost btn-sm" style={{ minHeight: 50 }} onClick={() => connectWallet(document.getElementById("payout") as HTMLInputElement)}>Use mine</button>
              </div>
              <div className="hint">MiniPay, Valora, MetaMask or any Celo wallet. You can cash cNGN out to a Nigerian bank through partners like Busha or Quidax.</div>
            </div>
            <div className="field">
              <label className="toggle">
                <input type="checkbox" checked={humansOnly} onChange={(e) => setHumansOnly(e.target.checked)} />
                <span><b style={{ color: "var(--text)" }}>Verified humans only</b> <span className="muted">(recommended)</span><br />
                  <span className="small muted">Each buyer proves they&apos;re a real, unique person with Self. Bots and duplicate accounts are turned away, and the per-person limit holds across all of a buyer&apos;s accounts and agents.</span></span>
              </label>
            </div>
            <div className="field">
              <label className="toggle">
                <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} disabled={!humansOnly} />
                <span><b style={{ color: "var(--text)" }}>18+ event</b><br /><span className="small muted">Buyers prove they&apos;re over 18 without showing their ID or date of birth.</span></span>
              </label>
            </div>
            {errors.length > 0 && <div className="notice notice-bad" style={{ marginTop: 16 }}>{errors.map((x) => <div key={x}>{x}</div>)}</div>}
            <button className="btn btn-block btn-lg" style={{ marginTop: 22 }} disabled={busy}>
              {busy ? <span className="spinner" /> : null} {busy ? "Creating…" : "Create event"}
            </button>
          </form>

          <aside style={{ position: "sticky", top: 90 }}>
            <span className="eyebrow">Live preview</span>
            <div className="card ev" style={{ marginTop: 14 }}>
              <div className="ev-art"><Scene kind={sceneFor(title)} seed={title.length + 5} /></div>
              <div className="ev-body">
                <div className="ev-date">{when}</div>
                <div className="ev-title">{title || "Your event name"}</div>
                <div className="ev-meta">{venue || "Venue"}, {city || "City"}</div>
                <div className="row between" style={{ marginTop: 14 }}>
                  <span className="price">{priceNum ? `₦${fmtNum(priceNum)}` : "₦—"}</span>
                  <span className="small muted">{capacity ? `${fmtNum(Number(capacity))} left` : "— left"}</span>
                </div>
                <div className="bar"><span style={{ width: "0%" }} /></div>
                <div className="row" style={{ marginTop: 12, gap: 6 }}>
                  {humansOnly && <span className="pill pill-good">Verified humans</span>}
                  {adult && <span className="pill">18+</span>}
                  <span className="pill">{perPerson} per person</span>
                </div>
              </div>
            </div>
            <div className="card card-tight small muted" style={{ marginTop: 14 }}>
              After you create it you get two links: a public page to share, and a private dashboard with your door scanner.
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
