"use client";

import { useEffect, useState } from "react";
import { Check, Shield } from "@/components/icons";

type Status = {
  registry: string;
  agentWallet: string;
  registered: boolean;
  agentId: string | null;
  agentURI: string | null;
  expectedURI: string;
  celoBalanceWei: string;
};

/** Owner tools: register Kovenra's ERC-8004 identity in one click. Needs the CRON_SECRET password. */
export default function Owner() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ tx: string; txUrl: string; agentId?: string } | null>(null);

  const load = async () => {
    try {
      const r = await fetch("/api/identity", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message ?? "Couldn't read the registry");
      setStatus(j);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const act = async (path: "register" | "update-uri") => {
    const what = path === "register" ? "register Kovenra on the ERC-8004 Identity Registry" : "point Kovenra's identity at the current site address";
    if (!window.confirm(`This sends one transaction on Celo mainnet from Kovenra's wallet to ${what}. It costs a tiny amount of CELO. Continue?`)) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/identity/${path}`, { method: "POST", headers: { authorization: `Bearer ${pw.trim()}` } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message ?? j.error ?? "Something went wrong");
      setDone(j);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const celo = status ? Number(BigInt(status.celoBalanceWei) / 10n ** 14n) / 10_000 : 0;

  return (
    <div className="wrap narrow section stack">
      <span className="eyebrow">Owner tools</span>
      <h1 style={{ fontSize: "clamp(34px,6vw,54px)" }}>Kovenra&apos;s ERC-8004 identity</h1>
      <p className="lead">Every hackathon entry needs its agent registered in the official ERC-8004 Identity Registry on Celo. This does it from Kovenra&apos;s own wallet, in one click. No ID scan needed.</p>

      <div className="card stack" style={{ marginTop: 20 }}>
        {!status && !error && <p className="muted">Reading the registry…</p>}
        {status && (
          <>
            <div className="row between"><span className="muted">Status</span>{status.registered ? <span className="pill pill-good"><Check size={13} /> Registered{status.agentId ? ` · agent #${status.agentId}` : ""}</span> : <span className="pill">Not registered yet</span>}</div>
            <div className="row between"><span className="muted">Agent wallet</span><a className="mono small gold" href={`https://celoscan.io/address/${status.agentWallet}`} target="_blank" rel="noreferrer">{status.agentWallet.slice(0, 8)}…{status.agentWallet.slice(-6)}</a></div>
            <div className="row between"><span className="muted">Gas balance</span><span className="mono small">{celo} CELO</span></div>
            <div className="row between"><span className="muted">Registry</span><a className="mono small gold" href={`https://celoscan.io/address/${status.registry}`} target="_blank" rel="noreferrer">{status.registry.slice(0, 8)}…{status.registry.slice(-6)}</a></div>
            {status.registered && status.agentURI && <div className="row between"><span className="muted">Points to</span><span className="mono small break">{status.agentURI}</span></div>}
          </>
        )}
      </div>

      {status && (!status.registered || (status.agentURI && status.agentURI !== status.expectedURI)) && (
        <div className="card stack">
          <label htmlFor="pw" className="row" style={{ gap: 6 }}><Shield size={15} className="gold" /> Owner password (your CRON_SECRET from Vercel)</label>
          <input id="pw" type="password" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Paste it here" />
          {!status.registered ? (
            <button className="btn btn-lg" disabled={busy || !pw} onClick={() => act("register")}>{busy ? <span className="spinner" /> : null} {busy ? "Registering…" : "Register Kovenra on ERC-8004"}</button>
          ) : (
            <button className="btn" disabled={busy || !pw} onClick={() => act("update-uri")}>{busy ? "Updating…" : `Update address to ${status.expectedURI}`}</button>
          )}
          <p className="small faint">The password never leaves this request. It isn&apos;t stored anywhere.</p>
        </div>
      )}

      {done && (
        <div className="notice notice-good">
          Done. {done.agentId ? <>Kovenra is agent <b>#{done.agentId}</b>. </> : null}
          <a href={done.txUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>See the transaction on Celoscan</a>
        </div>
      )}
      {error && <div className="notice notice-bad">{error}</div>}
    </div>
  );
}
