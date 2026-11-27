"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import SendPay from "./SendPay";
import { friendlyError } from "@/lib/client/friendly";

// Wallet, Self and x402 code is heavy; load it only when the fan taps "Get your ticket".
const lib = () => import("@/lib/client/buyer");
const AGENT_KEY = "kovenra:self-agent-key";

interface Props {
  slug: string;
  priceLabel: string;
  priceUsdt: string | null; // decimal string
  remaining: number;
  humansOnly: boolean;
  minAge: number;
  perPersonLimit: number;
  /** Tickets handed back by their owners, buyable at face value once sold out. */
  listed?: number;
  drop?: { phase: "entries" | "drawing" | "claim" | "open"; entryClosesAt: string; claimMinutes: number; drawAt: string | null; entries: number } | null;
}

type Step = "send" | "idle" | "verify" | "verifying" | "wallet" | "confirm" | "paying" | "done" | "entered";

const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { weekday: "short", hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Africa/Lagos" });

/**
 * Open the Self app. Inside wallet browsers (MiniPay) a plain https link to redirect.self.xyz
 * goes to the Play Store, so use the same app links Self's own redirect page uses:
 * an Android intent with the app's package, or the proofofpassport:// scheme on iPhone.
 */
function openSelfApp(deepLink: string) {
  let query = "";
  try {
    query = new URL(deepLink).search;
  } catch {
    query = deepLink.includes("?") ? deepLink.slice(deepLink.indexOf("?")) : "";
  }
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) {
    const fallback = encodeURIComponent("https://play.google.com/store/apps/details?id=com.proofofpassportapp");
    window.location.href = `intent://open-passport${query}#Intent;scheme=proofofpassport;package=com.proofofpassportapp;S.browser_fallback_url=${fallback};end`;
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    window.location.href = `proofofpassport://open-passport${query}`;
  } else {
    window.open(deepLink, "_blank", "noopener");
  }
}

function toUnits6(s: string): bigint {
  const [w, f = ""] = s.split(".");
  return BigInt(w) * 1_000_000n + BigInt((f + "000000").slice(0, 6));
}

export default function BuyPanel(p: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, setVerified] = useState<boolean | null>(null);
  const [link, setLink] = useState<{ deepLink: string; qr: string | null } | null>(null);
  const [buyer, setBuyer] = useState<Address | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [mobile, setMobile] = useState(false);
  const [hasWallet, setHasWallet] = useState(true);
  const [inMiniPay, setInMiniPay] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const eth = (window as unknown as { ethereum?: { isMiniPay?: boolean } }).ethereum;
    setMobile(/Android|iPhone|iPad/i.test(navigator.userAgent) || Boolean(eth?.isMiniPay));
    setHasWallet(Boolean(eth));
    setInMiniPay(Boolean(eth?.isMiniPay));
    // Inside MiniPay the wallet connects on its own, no button (MiniPay's listing rule).
    if (eth?.isMiniPay) {
      lib()
        .then(async (b) => {
          const addr = await b.connectWallet();
          setBuyer(addr);
          setBalance(await b.usdtBalance(addr).catch(() => null));
        })
        .catch(() => {});
    }
    try {
      setVerified(Boolean(localStorage.getItem(AGENT_KEY)));
    } catch {
      setVerified(false);
    }
  }, []);

  const price = p.priceUsdt ? toUnits6(p.priceUsdt) : null;
  const [dropNote, setDropNote] = useState<string | null>(null);

  /** What to do once the fan is verified: enter the draw, check the draw, or go to payment. */
  async function next() {
    const ph = p.drop?.phase;
    if (ph === "entries") return enter();
    if (ph === "claim" || ph === "open") return checkDraw();
    return wallet();
  }

  async function begin() {
    setError(null);
    setDropNote(null);
    if (p.humansOnly) {
      setStep("wallet");
      const s = await (await lib()).agentStatus().catch(() => null);
      if (!s?.verified) {
        setVerified(false);
        return setStep("verify");
      }
      setVerified(true);
    }
    await next();
  }

  async function enter() {
    setStep("wallet");
    const r = await (await lib()).enterDraw(p.slug).catch((e: Error) => ({ ok: false, status: 0, body: { message: friendlyError(e, "Couldn't enter the draw. Please try again.") } as Record<string, unknown> }));
    if (r.ok) {
      setDropNote(String(r.body.message ?? "You're in the draw."));
      setStep("entered");
    } else {
      setError(String(r.body.message ?? "Couldn't enter the draw."));
      setStep("idle");
    }
  }

  async function checkDraw() {
    setStep("wallet");
    const r = await (await lib()).checkEntry(p.slug).catch(() => null);
    const b = (r?.body ?? {}) as { entered?: boolean; winner?: boolean; place?: number; entries?: number; phase?: string; claimUntil?: string };
    if (!r?.ok || !b.entered) {
      setError("You didn't enter this drop, so you can't buy a ticket for it.");
      return setStep("idle");
    }
    if (b.winner || b.phase === "open") {
      setDropNote(b.winner ? `You won a seat (#${b.place} of ${b.entries}).${b.claimUntil ? ` Pay before ${when(b.claimUntil)}.` : ""}` : "The claim window is over, and seats are open to everyone who entered.");
      return wallet();
    }
    setDropNote(`Not picked this time: you're #${b.place} of ${b.entries}.${b.claimUntil ? ` If winners don't claim by ${when(b.claimUntil)}, the remaining seats open to everyone who entered.` : ""}`);
    setStep("idle");
  }

  async function verify() {
    setError(null);
    setStep("verifying");
    try {
      const s = await (await lib()).startVerification(p.minAge);
      setLink({ deepLink: s.deepLink, qr: s.qr });
      // Open the Self app directly (its own app link), so this page stays put and keeps waiting.
      if (mobile) openSelfApp(s.deepLink);
      await s.done;
      setVerified(true);
      setLink(null);
      await next();
    } catch (e) {
      setError(friendlyError(e, "Verification didn't finish. Please tap Verify with Self again."));
      setStep("verify");
    }
  }

  async function wallet() {
    setError(null);
    if (!hasWallet && canSend) return setStep("send");
    setStep("wallet");
    try {
      const b = await lib();
      const addr = buyer ?? (await b.connectWallet());
      setBuyer(addr);
      setBalance(await b.usdtBalance(addr).catch(() => null));
      setStep("confirm");
    } catch (e) {
      setError(friendlyError(e, "Couldn't connect your wallet. Please try again."));
      setStep("idle");
    }
  }

  async function pay() {
    if (!buyer || !price) return;
    setError(null);
    setStep("paying");
    try {
      const r = await (await lib()).buyTicket(p.slug, buyer, price + price / 100n); // allow the 1% rate move the server accepts
      if (r.ok && r.body.ticket?.id) {
        try {
          const mine = JSON.parse(localStorage.getItem("kovenra:tickets") ?? "[]");
          localStorage.setItem("kovenra:tickets", JSON.stringify([r.body.ticket.id, ...mine].slice(0, 50)));
        } catch {}
        setStep("done");
        router.push(`/t/${r.body.ticket.id}?new=1`);
        return;
      }
      const msg =
        r.status === 403 ? r.body.message ?? "This event only sells to verified people." :
        r.status === 429 ? r.body.message ?? "You've reached the ticket limit for this event." :
        r.status === 409 ? "Sold out." :
        r.status === 402 ? `Payment didn't go through${r.body.error ? ` (${r.body.error})` : ""}. Nothing was charged.` :
        r.body.message ?? `Something went wrong (${r.status}).`;
      if (r.status === 403 && r.body.reason === "not_verified") setVerified(false);
      setError(msg);
      setStep("confirm");
    } catch (e) {
      setError(friendlyError(e, "The payment didn't go through. Nothing was charged. Please try again."));
      setStep("confirm");
    }
  }

  const resale = p.remaining <= 0 && (p.listed ?? 0) > 0;
  // Paying with the wallet's Send button works for open events (no Self check, no draw, not a resale).
  const canSend = !p.humansOnly && !p.drop && !resale;
  if (p.remaining <= 0 && !resale) {
    return (
      <div className="card">
        <div className="price">Sold out</div>
        <p className="muted small" style={{ marginTop: 6 }}>Every ticket went to a real person. If someone can&apos;t go, their ticket comes back here at face value. Check again later.</p>
      </div>
    );
  }

  const short = buyer ? `${buyer.slice(0, 6)}…${buyer.slice(-4)}` : "";
  const enough = balance === null || price === null || balance >= price;
  const ph = p.drop?.phase;
  const idleLabel = !price ? "Price unavailable, try again shortly"
    : ph === "entries" ? "Enter the fair drop"
    : ph === "drawing" ? "Drawing winners…"
    : ph === "claim" || ph === "open" ? "Check if you won"
    : resale ? "Buy a returned ticket at face value"
    : "Get your ticket";

  return (
    <div className="card stack">
      <div className="row between">
        <div>
          <div className="price">{p.priceLabel}</div>
          {p.priceUsdt && <div className="small muted">≈ ${Number(p.priceUsdt).toFixed(2)} USD₮ at today&apos;s rate</div>}
        </div>
        <span className="small muted">{resale ? `${p.listed} returned` : `${p.remaining} left`}</span>
      </div>

      {p.drop && (
        <div className="notice" style={{ borderColor: "rgba(253,177,41,0.35)" }}>
          <b className="gold">Fair drop</b>
          <p className="small muted" style={{ marginTop: 4 }}>
            {ph === "entries" && <>Entries close {when(p.drop.entryClosesAt)}. {p.drop.entries} {p.drop.entries === 1 ? "person has" : "people have"} entered. One entry per person; a Celo block picks the winners.</>}
            {ph === "drawing" && <>Entries are closed. The draw uses the first Celo block after closing time. Check back in a minute.</>}
            {ph === "claim" && p.drop.drawAt && <>Winners are drawn. They have until {when(new Date(Date.parse(p.drop.drawAt) + p.drop.claimMinutes * 60_000).toISOString())} to pay.</>}
            {ph === "open" && <>The claim window is over. Any seats left are open to everyone who entered.</>}
          </p>
        </div>
      )}

      {step === "idle" && (
        <>
          <button className="btn btn-block" onClick={begin} disabled={!price || ph === "drawing"}>{idleLabel}</button>
          {canSend && price && !inMiniPay && !step.startsWith("send") && (
            <button className="btn btn-ghost btn-block" onClick={() => setStep("send")}>Pay by sending from another wallet</button>
          )}
        </>
      )}
      {step === "send" && <SendPay slug={p.slug} onCancel={() => setStep("idle")} />}
      {dropNote && <div className="notice notice-good">{dropNote}</div>}
      {step === "entered" && <p className="small faint">Come back to this page when entries close to see if you won.</p>}

      {(step === "verify" || step === "verifying") && (
        <div className="stack">
          <div className="notice">
            <b>Quick check: are you a real person?</b>
            <p className="muted small" style={{ marginTop: 4 }}>
              This organizer sells {p.perPersonLimit === 1 ? "one ticket" : `${p.perPersonLimit} tickets`} per person{p.minAge ? ` and only to people ${p.minAge}+` : ""}.
              Scan your passport once in the free Self app. Kovenra never sees your name or passport, only a yes or no.
            </p>
          </div>
          {step === "verify" && <button className="btn btn-block" onClick={verify}>Verify with Self</button>}
          {step === "verifying" && (
            <div className="stack" style={{ textAlign: "center" }}>
              {link?.qr && !mobile && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={link.qr} alt="Scan with the Self app" style={{ width: 220, height: 220, margin: "0 auto", background: "#fff", borderRadius: 12, padding: 8 }} />
              )}
              {link && (
                <button className="btn btn-block" type="button" onClick={() => openSelfApp(link.deepLink)}>Open the Self app</button>
              )}
              {link && mobile && (
                <div className="notice" style={{ textAlign: "left" }}>
                  <p className="small muted">Self didn&apos;t open? Copy this link, paste it into Chrome (or Safari), open it, and Self will open. Then come back to this page.</p>
                  <button
                    className="btn btn-ghost btn-block"
                    type="button"
                    style={{ marginTop: 8 }}
                    onClick={() => navigator.clipboard?.writeText(link.deepLink).then(() => setCopied(true)).catch(() => setCopied(false))}
                  >
                    {copied ? "Link copied" : "Copy Self link"}
                  </button>
                </div>
              )}
              <div className="row" style={{ justifyContent: "center" }}><span className="spinner" /> <span className="muted small">Waiting for your scan…</span></div>
              <p className="small faint">After Self says you&apos;re verified, come back to this page. Don&apos;t close or refresh it; your ticket step opens here on its own.</p>
              <a className="small muted" href="/verify" target="_blank" rel="noreferrer">First time? See the 2-minute guide</a>
            </div>
          )}
        </div>
      )}

      {step === "wallet" && <div className="row"><span className="spinner" /> <span className="muted">Connecting your wallet…</span></div>}

      {(step === "confirm" || step === "paying") && (
        <div className="stack">
          <div className="list">
            <div className="list-row"><span className="muted">Wallet</span><span className="mono">{short}</span></div>
            {p.humansOnly && <div className="list-row"><span className="muted">Verified person</span><span className="ok">Yes</span></div>}
            <div className="list-row"><span className="muted">You pay</span><span><b>{p.priceUsdt ? `${Number(p.priceUsdt).toFixed(2)} USD₮` : "…"}</b></span></div>
            {balance !== null && <div className="list-row"><span className="muted">Your USD₮</span><span>{(Number(balance) / 1e6).toFixed(2)}</span></div>}
          </div>
          {!enough && <div className="notice notice-bad">Not enough USD₮. Add cash in MiniPay (or send USD₮ on Celo to this wallet), then try again.</div>}
          <button className="btn btn-block" onClick={pay} disabled={step === "paying" || !enough}>
            {step === "paying" ? <><span className="spinner" /> Paying…</> : `Pay ${p.priceUsdt ? Number(p.priceUsdt).toFixed(2) : ""} USD₮`}
          </button>
          <p className="small faint">No gas needed. The payment settles on Celo in about 3 seconds, and you get your QR ticket right away.</p>
        </div>
      )}

      {step === "done" && <div className="notice notice-good">Ticket confirmed. Opening it…</div>}
      {error && <div className="notice notice-bad">{error}</div>}
    </div>
  );
}
