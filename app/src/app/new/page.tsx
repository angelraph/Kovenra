"use client";

import Link from "next/link";
import { useState } from "react";

interface Created {
  slug: string;
  adminKey: string;
  pageUrl: string;
  dashboardUrl: string;
}

export default function NewEvent() {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [created, setCreated] = useState<Created | null>(null);
  const [humansOnly, setHumansOnly] = useState(true);
  const [adult, setAdult] = useState(false);

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
    const date = String(f.get("date") ?? "");
    const time = String(f.get("time") ?? "20:00");
    const body = {
      title: f.get("title"),
      description: f.get("description"),
      venue: f.get("venue"),
      city: f.get("city"),
      startsAt: `${date}T${time}:00+01:00`, // Lagos time
      priceNaira: String(f.get("price") ?? "").replace(/[,\s₦]/g, ""),
      capacity: Number(f.get("capacity")),
      perPersonLimit: Number(f.get("perPerson")),
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

  if (created) {
    const share = `https://wa.me/?text=${encodeURIComponent(`Get your ticket here: ${created.pageUrl}`)}`;
    return (
      <div className="wrap narrow section stack">
        <span className="pill pill-good"><span className="dot" /> Your event is live</span>
        <h2>You&apos;re selling tickets</h2>
        <p className="muted">Share your event link anywhere. Fans buy on their phone, and the naira goes to your wallet.</p>
        <div className="card stack">
          <label>Event link (share this)</label>
          <div className="mono break">{created.pageUrl}</div>
          <div className="row">
            <a className="btn btn-sm" href={share} target="_blank" rel="noreferrer">Share on WhatsApp</a>
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(created.pageUrl)}>Copy link</button>
            <Link className="btn btn-ghost btn-sm" href={`/e/${created.slug}`}>Open</Link>
          </div>
        </div>
        <div className="card stack">
          <label>Your private dashboard and door scanner</label>
          <p className="small muted">Keep this link to yourself. It shows your sales and opens the scanner. It is saved on this device too.</p>
          <div className="mono break small">{created.dashboardUrl}</div>
          <div className="row">
            <Link className="btn btn-sm" href={`/dashboard/${created.slug}#key=${created.adminKey}`}>Open dashboard</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(created.dashboardUrl)}>Copy private link</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap narrow section">
      <h2>Sell tickets</h2>
      <p className="muted" style={{ marginTop: 8 }}>Free to list. Fans pay in USD₮ or cNGN, and you receive naira (cNGN) in your wallet.</p>
      <form onSubmit={submit} className="card" style={{ marginTop: 20 }}>
        <div className="field">
          <label htmlFor="title">Event name</label>
          <input id="title" name="title" required placeholder="December Rooftop Jam" />
        </div>
        <div className="field">
          <label htmlFor="description">What&apos;s happening</label>
          <textarea id="description" name="description" placeholder="Live band, DJ till late, food on site." />
        </div>
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <div>
            <label htmlFor="venue">Venue</label>
            <input id="venue" name="venue" required placeholder="e.g. Civic Centre hall" />
          </div>
          <div>
            <label htmlFor="city">City</label>
            <input id="city" name="city" required placeholder="e.g. Abuja, Ibadan, Port Harcourt" />
          </div>
          <div>
            <label htmlFor="date">Date</label>
            <input id="date" name="date" type="date" required />
          </div>
          <div>
            <label htmlFor="time">Start time (Nigeria time)</label>
            <input id="time" name="time" type="time" defaultValue="20:00" required />
          </div>
          <div>
            <label htmlFor="price">Ticket price (₦)</label>
            <input id="price" name="price" inputMode="decimal" required placeholder="5000" />
            <div className="hint">Fans can pay the dollar equivalent in USD₮. Minimum about ₦1,500.</div>
          </div>
          <div>
            <label htmlFor="capacity">Number of tickets</label>
            <input id="capacity" name="capacity" type="number" min={1} required placeholder="150" />
          </div>
          <div>
            <label htmlFor="perPerson">Tickets per person</label>
            <select id="perPerson" name="perPerson" defaultValue="1">
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
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => connectWallet(document.getElementById("payout") as HTMLInputElement)}>Use mine</button>
          </div>
          <div className="hint">MiniPay, Valora, MetaMask or any Celo wallet. You can cash cNGN out to a Nigerian bank through cNGN partners like Busha or Quidax.</div>
        </div>
        <div className="field">
          <label className="toggle">
            <input type="checkbox" checked={humansOnly} onChange={(e) => setHumansOnly(e.target.checked)} />
            <span><b>Verified humans only</b> <span className="muted">(recommended)</span><br />
              <span className="small muted">Each buyer proves they&apos;re a real, unique person with Self. Bots and duplicate accounts are turned away, and the per-person limit holds across all of a buyer&apos;s accounts and agents.</span></span>
          </label>
        </div>
        <div className="field">
          <label className="toggle">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} disabled={!humansOnly} />
            <span><b>18+ event</b><br /><span className="small muted">Buyers prove they&apos;re over 18 without showing their ID or date of birth.</span></span>
          </label>
        </div>
        {errors.length > 0 && <div className="notice notice-bad" style={{ marginTop: 16 }}>{errors.map((x) => <div key={x}>{x}</div>)}</div>}
        <button className="btn btn-block" style={{ marginTop: 20 }} disabled={busy}>
          {busy ? <span className="spinner" /> : null} {busy ? "Creating…" : "Create event"}
        </button>
      </form>
    </div>
  );
}
