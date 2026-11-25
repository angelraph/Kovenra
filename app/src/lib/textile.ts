import crypto from "node:crypto";
import { toHex, type Address, type Hex } from "viem";
import { CHAIN_ID } from "./chain";

/**
 * Textile FX v2 RFQ client (keyless). A firm quote is bound to one taker
 * wallet; the first request carries a TakerControl proof signed by it.
 * Docs: https://docs.textilecredit.com/api/v2/rfq
 */
export const TEXTILE_API = "https://api.textilecredit.com";

export interface Ticker {
  ticker_id: string;
  last_price: string;
  bid: string;
  ask: string;
  base_volume: string;
}

export interface FirmQuote {
  rfqId: string;
  claimToken: string;
  sellAmount: bigint;
  buyAmount: bigint;
  feeAmount: bigint;
  takerPays: bigint;
  reactor: Address;
  expiresAt: Date;
  swap: { to: Address; data: Hex };
  approval?: { to: Address; data: Hex };
}

export type QuoteSigner = (typed: {
  domain: { name: string; version: string; chainId: number };
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
}) => Promise<Hex>;

type FetchLike = typeof fetch;

export class TextileError extends Error {
  constructor(message: string, readonly code?: string, readonly status?: number) {
    super(message);
  }
}

/** NGN per USD₮ from the public feed. `ask` is what a USD₮ seller gets per unit. */
export async function getUsdtNgn(fetcher: FetchLike = fetch): Promise<Ticker> {
  const res = await fetcher(`${TEXTILE_API}/tickers?ticker_id=USDT_NGN`, { cache: "no-store" });
  if (!res.ok) throw new TextileError(`ticker ${res.status}`, "ticker_failed", res.status);
  const rows = (await res.json()) as Ticker[];
  if (!rows[0]) throw new TextileError("no USDT_NGN ticker", "ticker_missing");
  return rows[0];
}

export async function preview(
  p: { sellToken: Address; buyToken: Address; sellAmount?: bigint; buyAmount?: bigint },
  fetcher: FetchLike = fetch,
): Promise<{ buyAmount: bigint; sellAmount: bigint; feeAmount: bigint; available: bigint }> {
  const body: Record<string, unknown> = { chainId: CHAIN_ID, sellToken: p.sellToken, buyToken: p.buyToken };
  if (p.sellAmount !== undefined) body.sellAmount = p.sellAmount.toString();
  if (p.buyAmount !== undefined) body.buyAmount = p.buyAmount.toString();
  const res = await fetcher(`${TEXTILE_API}/v2/rfq/preview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { data?: Record<string, string>; error?: { code?: string; message?: string } };
  if (!res.ok || !json.data) throw new TextileError(json.error?.message ?? `preview ${res.status}`, json.error?.code, res.status);
  return {
    buyAmount: BigInt(json.data.buyAmount),
    sellAmount: BigInt(json.data.sellAmount),
    feeAmount: BigInt(json.data.feeAmount ?? "0"),
    available: BigInt(json.data.availableSellAmount ?? "0"),
  };
}

export function takerControlTypedData(taker: Address, nonce: Hex, issuedAt: number) {
  return {
    domain: { name: "Textile Taker Control", version: "1", chainId: CHAIN_ID },
    types: {
      TakerControl: [
        { name: "taker", type: "address" },
        { name: "chainId", type: "uint256" },
        { name: "nonce", type: "bytes32" },
        { name: "issuedAt", type: "uint256" },
      ],
    },
    primaryType: "TakerControl",
    message: { taker, chainId: BigInt(CHAIN_ID), nonce, issuedAt: BigInt(issuedAt) },
  };
}

/**
 * Request a firm quote. Sends unsigned first (a live ~12h grant may cover the
 * wallet); signs TakerControl only when Textile asks for proof of control.
 */
export async function requestFirmQuote(
  p: { sellToken: Address; buyToken: Address; sellAmount: bigint; taker: Address },
  sign: QuoteSigner,
  fetcher: FetchLike = fetch,
): Promise<FirmQuote> {
  const base = {
    chainId: CHAIN_ID,
    sellToken: p.sellToken,
    buyToken: p.buyToken,
    sellAmount: p.sellAmount.toString(),
    taker: p.taker,
  };
  const send = async (extra: object = {}) => {
    const res = await fetcher(`${TEXTILE_API}/v2/rfq/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...base, ...extra }),
      signal: AbortSignal.timeout(75_000),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Textile's response shape, validated below
    return { res, json: (await res.json()) as { data?: any; error?: { code?: string; message?: string } } };
  };

  let { res, json } = await send();
  if (res.status === 401) {
    const nonce = toHex(crypto.randomBytes(32));
    const issuedAt = Date.now();
    const signature = await sign(takerControlTypedData(p.taker, nonce, issuedAt));
    ({ res, json } = await send({ takerProof: { nonce, issuedAt, signature } }));
  }
  const d = json.data;
  if (!res.ok || !d) throw new TextileError(json.error?.message ?? `request ${res.status}`, json.error?.code, res.status);
  if (d.status !== "quoted" || !d.quote || !d.transactions?.swap) {
    throw new TextileError(`no quote (${d.status ?? "unknown"})`, d.reason ?? d.status ?? "no_quote", res.status);
  }
  return {
    rfqId: d.rfqId,
    claimToken: d.claimToken,
    sellAmount: BigInt(d.quote.sellAmount),
    buyAmount: BigInt(d.quote.buyAmount),
    feeAmount: BigInt(d.quote.feeAmount ?? "0"),
    takerPays: BigInt(d.quote.takerPays),
    reactor: (d.quote.spender ?? d.quote.reactor) as Address,
    expiresAt: new Date(d.quote.expiresAt),
    swap: { to: d.transactions.swap.to, data: d.transactions.swap.data },
    approval: d.transactions.approval ? { to: d.transactions.approval.to, data: d.transactions.approval.data } : undefined,
  };
}

/** Tell Textile the swap hash (optional for us, but it speeds up status tracking). */
export async function submitSwap(q: FirmQuote, txHash: Hex, fetcher: FetchLike = fetch): Promise<void> {
  await fetcher(`${TEXTILE_API}/v2/rfq/${q.rfqId}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Rfq-Claim": q.claimToken },
    body: JSON.stringify({ txHash }),
  }).catch(() => undefined);
}

/**
 * USD₮ to charge so the conversion covers a naira price, using the live ask
 * plus a small buffer for spread and the ~2 bps fee. Never below Textile's $1 floor.
 */
export function usdtForNaira(ngnUnits: bigint, ngnPerUsdt: string, bufferBps: number): bigint {
  // ngnUnits and USD₮ both have 6 decimals; rate as a 6-decimal fixed-point number.
  const [w, f = ""] = ngnPerUsdt.split(".");
  const rate6 = BigInt(w) * 1_000_000n + BigInt((f + "000000").slice(0, 6));
  if (rate6 <= 0n) throw new TextileError("bad rate");
  const raw = (ngnUnits * 1_000_000n + rate6 - 1n) / rate6; // ceil
  const buffered = (raw * BigInt(10_000 + bufferBps) + 9_999n) / 10_000n;
  const floor = 1_000_000n; // $1
  return buffered < floor ? floor : buffered;
}
