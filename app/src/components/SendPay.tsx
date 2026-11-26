"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Pay by sending: the buyer pastes the wallet they'll pay from, sends USD₮ with
 * their wallet's normal Send button, and this page turns into their ticket.
 * For wallets that can't open web pages.
 */
interface Order {
  order: string;
  payTo: string;
  from: string;
  amountLabel: string;
  expiresAt: string;
}

export default function SendPay({ slug, onCancel }: { slug: string; onCancel: () => void }) {
  const router = useRouter();
  const storeKey = `kovenra:send:${slug}`;
  const [from, setFrom] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick up an order already in progress (the buyer may have left to open MiniPay).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) ?? "null") as Order | null;
      if (saved && Date.parse(saved.expiresAt) + 3 * 3600_000 > Date.now()) setOrder(saved);
    } catch {}
  }, [storeKey]);

  useEffect(() => {
    if (!order) return;
    import("qrcode").then((Q) => Q.toDataURL(order.payTo, { margin: 1, width: 360 }).then(setQr)).catch(() => {});
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/send-orders/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order: order.order }) });
        const b = await r.json();
        if (b.paid && b.ticket?.id) {
          try {
            localStorage.removeItem(storeKey);
            const mine = JSON.parse(localStorage.getItem("kovenra:tickets") ?? "[]");
            localStorage.setItem("kovenra:tickets", JSON.stringify([b.ticket.id, ...mine].slice(0, 50)));
          } catch {}
          router.push(`/t/${b.ticket.id}?new=1`);
          return;
        }
        if (r.status >= 400) {
          setError(b.message ?? "Something went wrong. Start again.");
          if (r.status !== 409) return;
        }
      } catch {}
      if (!stop) timer.current = setTimeout(poll, 4000);
    };
    poll();
    return () => {
      stop = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [order, router, storeKey]);

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/events/${slug}/send-order`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from: from.trim() }) });
      const b = await r.json();
      if (!r.ok) return setError(b.message ?? "Couldn't start. Try again.");
      setOrder(b);
      try {
        localStorage.setItem(storeKey, JSON.stringify(b));
      } catch {}
    } catch {
      setError("No connection. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string, what: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function cancel() {
    try {
      localStorage.removeItem(storeKey);
    } catch {}
    setOrder(null);
    onCancel();
  }

  if (!order) {
    return (
      <div className="stack">
        <div className="notice">
          <b>Pay from Valora, MetaMask or another Celo wallet</b>
          <p className="muted small" style={{ marginTop: 4 }}>
            First, paste the wallet address you&apos;ll pay from. It starts with 0x. Don&apos;t pay from an exchange, because we can&apos;t tell the payment is yours.
          </p>
        </div>
        <input
          className="input"
          placeholder="0x…"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          style={{ fontFamily: "var(--font-mono, monospace)" }}
        />
        <button className="btn btn-block" onClick={start} disabled={busy || from.trim().length < 42}>
          {busy ? <><span className="spinner" /> One moment…</> : "Continue"}
        </button>
        <button className="btn btn-ghost btn-block" onClick={cancel}>Back</button>
        {error && <div className="notice notice-bad">{error}</div>}
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="notice">
        <b>Send exactly {order.amountLabel} USD₮</b>
        <ol className="small muted" style={{ margin: "8px 0 0 18px", lineHeight: 1.7 }}>
          <li>Open your wallet and tap <b>Send</b>.</li>
          <li>Paste the address below (or scan the QR).</li>
          <li>Type <b>{order.amountLabel}</b>, choose <b>USD₮ on Celo</b>, and send.</li>
          <li>Come back here. Your ticket appears on its own.</li>
        </ol>
      </div>
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="Kovenra's wallet address" style={{ width: 180, height: 180, margin: "0 auto", background: "#fff", borderRadius: 12, padding: 8 }} />
      )}
      <div className="list">
        <div className="list-row">
          <span className="muted">Send to</span>
          <span className="mono small" style={{ wordBreak: "break-all", textAlign: "right" }}>{order.payTo}</span>
        </div>
        <div className="list-row"><span className="muted">Amount</span><b>{order.amountLabel} USD₮</b></div>
        <div className="list-row"><span className="muted">From your wallet</span><span className="mono small">{order.from.slice(0, 6)}…{order.from.slice(-4)}</span></div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-block" onClick={() => copy(order.payTo, "address")}>{copied === "address" ? "Copied" : "Copy address"}</button>
        <button className="btn btn-ghost btn-block" onClick={() => copy(order.amountLabel, "amount")}>{copied === "amount" ? "Copied" : "Copy amount"}</button>
      </div>
      <div className="row" style={{ justifyContent: "center" }}><span className="spinner" /> <span className="muted small">Waiting for your payment. Keep this page open.</span></div>
      <p className="small faint">Send only from the wallet you entered, or we can&apos;t tell it&apos;s you. Your seat is held for 30 minutes.</p>
      {error && <div className="notice notice-bad">{error}</div>}
      <button className="btn btn-ghost btn-block" onClick={cancel}>Cancel</button>
    </div>
  );
}
