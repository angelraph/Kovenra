"use client";

import { friendlyError } from "@/lib/client/friendly";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Let the ticket holder hand their ticket back for face-value resale (or take it back). */
export default function ResaleBox({ id, code, listed, priceLabel }: { id: string; code: string; listed: boolean; priceLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [wallet, setWallet] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const useMine = async () => {
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<string[]> } }).ethereum;
    if (!eth) return setMsg({ ok: false, text: "No wallet found here. Paste your Celo wallet address instead." });
    const [a] = await eth.request({ method: "eth_requestAccounts" });
    if (a) setWallet(a);
  };

  const call = async (path: "resell" | "unlist") => {
    if (path === "resell" && !window.confirm(`List this ticket at face value (${priceLabel})? When someone buys it, this QR stops working and the money goes to your wallet.`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/tickets/${id}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, payoutAddress: wallet.trim() }) });
      const j = await r.json();
      setMsg({ ok: r.ok, text: j.message ?? (r.ok ? "Done." : "Something went wrong.") });
      if (r.ok) router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  if (listed) {
    return (
      <div className="card stack">
        <b>Listed for resale at face value</b>
        <p className="small muted">The next verified person to buy gets this seat. You&apos;ll be paid {priceLabel} worth, in the token they pay with, straight to your wallet.</p>
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => call("unlist")}>Keep my ticket instead</button>
        {msg && <div className={`notice ${msg.ok ? "notice-good" : "notice-bad"}`}>{msg.text}</div>}
      </div>
    );
  }

  return (
    <div className="card stack">
      {!open ? (
        <>
          <div className="row between"><b>Can&apos;t make it?</b><button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Hand it back</button></div>
          <p className="small muted">Resell at face value to the next verified fan. No touts, no markup, and you get your money back.</p>
        </>
      ) : (
        <>
          <b>Hand your ticket back at face value</b>
          <label htmlFor="w" className="small">Wallet for your refund (Celo)</label>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input id="w" className="mono" placeholder="0x…" value={wallet} onChange={(e) => setWallet(e.target.value)} />
            <button type="button" className="btn btn-ghost btn-sm" style={{ minHeight: 50 }} onClick={useMine}>Use mine</button>
          </div>
          <button className="btn" disabled={busy || !/^0x[0-9a-fA-F]{40}$/.test(wallet.trim())} onClick={() => call("resell")}>{busy ? "Listing…" : `List at ${priceLabel}`}</button>
          <p className="small faint">Kovenra never lets a ticket sell above face value.</p>
        </>
      )}
      {msg && <div className={`notice ${msg.ok ? "notice-good" : "notice-bad"}`}>{msg.text}</div>}
    </div>
  );
}
