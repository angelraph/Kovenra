"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Address } from "viem";

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
}

type Step = "idle" | "verify" | "verifying" | "wallet" | "confirm" | "paying" | "done";

function toUnits6(s: string): bigint {
  const [w, f = ""] = s.split(".");
  return BigInt(w) * 1_000_000n + BigInt((f + "000000").slice(0, 6));
}

export default function BuyPanel(p: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [link, setLink] = useState<{ deepLink: string; qr: string | null } | null>(null);
  const [buyer, setBuyer] = useState<Address | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const eth = (window as unknown as { ethereum?: { isMiniPay?: boolean } }).ethereum;
    setMobile(/Android|iPhone|iPad/i.test(navigator.userAgent) || Boolean(eth?.isMiniPay));
    try {
      setVerified(Boolean(localStorage.getItem(AGENT_KEY)));
    } catch {
      setVerified(false);
    }
  }, []);

  const price = p.priceUsdt ? toUnits6(p.priceUsdt) : null;

  async function begin() {
    setError(null);
    if (p.humansOnly) {
      setStep("wallet");
      const s = await (await lib()).agentStatus().catch(() => null);
      if (!s?.verified) {
        setVerified(false);
        return setStep("verify");
      }
      setVerified(true);
    }
    await wallet();
  }

  async function verify() {
    setError(null);
    setStep("verifying");
    try {
      const s = await (await lib()).startVerification(p.minAge);
      setLink({ deepLink: s.deepLink, qr: s.qr });
      if (mobile) window.location.href = s.deepLink;
      await s.done;
      setVerified(true);
      setLink(null);
      await wallet();
    } catch (e) {
      setError((e as Error).message || "Verification did not finish. Try again.");
      setStep("verify");
    }
  }

  async function wallet() {
    setError(null);
    setStep("wallet");
    try {
      const b = await lib();
      const addr = await b.connectWallet();
      setBuyer(addr);
      setBalance(await b.usdtBalance(addr).catch(() => null));
      setStep("confirm");
    } catch (e) {
      setError((e as Error).message);
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
      const m = (e as Error).message;
      setError(/rejected|denied/i.test(m) ? "You cancelled the payment." : m);
      setStep("confirm");
    }
  }

  if (p.remaining <= 0) {
    return <div className="card"><div className="price">Sold out</div><p className="muted small" style={{ marginTop: 6 }}>Every ticket went to a real person.</p></div>;
  }

  const short = buyer ? `${buyer.slice(0, 6)}…${buyer.slice(-4)}` : "";
  const enough = balance === null || price === null || balance >= price;

  return (
    <div className="card stack">
      <div className="row between">
        <div>
          <div className="price">{p.priceLabel}</div>
          {p.priceUsdt && <div className="small muted">≈ ${Number(p.priceUsdt).toFixed(2)} USD₮ at today&apos;s rate</div>}
        </div>
        <span className="small muted">{p.remaining} left</span>
      </div>

      {step === "idle" && (
        <button className="btn btn-block" onClick={begin} disabled={!price}>
          {price ? "Get your ticket" : "Price unavailable, try again shortly"}
        </button>
      )}

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
              {link && <a className="btn btn-ghost btn-block" href={link.deepLink}>Open the Self app</a>}
              <div className="row" style={{ justifyContent: "center" }}><span className="spinner" /> <span className="muted small">Waiting for your scan…</span></div>
              <a className="small muted" href="https://self.xyz" target="_blank" rel="noreferrer">Don&apos;t have Self? Get it free</a>
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
