"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { LiveStats } from "@/lib/stats";

export type Chain = { chainId: number; block: string; blockTime: string; txCount: number; gasGwei: string };
type Live = {
  stats: LiveStats | null;
  rate: number | null;
  rateHistory: number[];
  chain: Chain | null;
  blockHistory: number[];
};

const Ctx = createContext<Live>({ stats: null, rate: null, rateHistory: [], chain: null, blockHistory: [] });

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** One poller for the whole site. Every number it holds comes from a real source. */
export function LiveProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [rateHistory, setRateHistory] = useState<number[]>([]);
  const [chain, setChain] = useState<Chain | null>(null);
  const [blockHistory, setBlockHistory] = useState<number[]>([]);
  const lastBlock = useRef<string>("");

  useEffect(() => {
    let alive = true;
    const loadStats = async () => {
      const s = await getJson<LiveStats>("/api/stats");
      if (alive && s) setStats(s);
    };
    const loadRate = async () => {
      const r = await getJson<{ ngnPerUsdt: number | string }>("/api/rate");
      const v = r ? Number(r.ngnPerUsdt) : NaN;
      if (alive && Number.isFinite(v) && v > 0) {
        setRate(v);
        setRateHistory((h) => [...h.slice(-29), v]);
      }
    };
    const loadChain = async () => {
      if (document.hidden) return;
      const c = await getJson<Chain>("/api/chain");
      if (alive && c && c.block !== lastBlock.current) {
        lastBlock.current = c.block;
        setChain(c);
        setBlockHistory((h) => [...h.slice(-23), c.txCount]);
      }
    };
    loadStats();
    loadRate();
    loadChain();
    const a = setInterval(loadStats, 15_000);
    const b = setInterval(loadRate, 30_000);
    const c = setInterval(loadChain, 5_000);
    return () => {
      alive = false;
      clearInterval(a);
      clearInterval(b);
      clearInterval(c);
    };
  }, []);

  return <Ctx.Provider value={{ stats, rate, rateHistory, chain, blockHistory }}>{children}</Ctx.Provider>;
}

export const useLive = () => useContext(Ctx);

export function fmtNum(n: number | string | null | undefined, digits = 0) {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "string" ? Number(n) : n;
  return Number.isFinite(v) ? v.toLocaleString("en-NG", { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "—";
}

export function ago(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Live status line: current Celo block, used in the footer and the hero stage. */
export function ChainStatus({ compact = false }: { compact?: boolean }) {
  const { chain } = useLive();
  return (
    <span className="status">
      <span className="live-dot" />
      {chain ? (
        <>Celo mainnet · block #{Number(chain.block).toLocaleString("en-US")}{compact ? "" : ` · ${chain.gasGwei} gwei`}</>
      ) : (
        <>Connecting to Celo…</>
      )}
    </span>
  );
}
