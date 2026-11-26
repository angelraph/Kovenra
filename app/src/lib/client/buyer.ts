"use client";

// Import the browser-safe modules directly: the package index also loads an
// Ed25519 helper that needs node:crypto and cannot run in a browser.
import { SelfAgent } from "@selfxyz/agent-sdk/dist/SelfAgent.js";
import { requestRegistration } from "@selfxyz/agent-sdk/dist/registration-flow.js";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { createPublicClient, createWalletClient, custom, erc20Abi, http, type Address } from "viem";
import { celo } from "viem/chains";

/**
 * The fan's side of a purchase, in the browser.
 *  1. Wallet: MiniPay (auto-connects) or any injected Celo wallet; pays USD₮.
 *  2. Self Agent ID: a personal agent key lives on this device. It is
 *     registered once, by scanning a passport in the Self app. Kovenra never
 *     sees the passport, only that a unique human stands behind the key.
 *  3. Each request to the ticket counter is signed by that agent key and paid
 *     over x402. The payment is capped at exactly the price the fan confirmed.
 */
const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as Address;
const AGENT_KEY = "kovenra:self-agent-key";

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown>; isMiniPay?: boolean };

export function injected(): Eip1193 | null {
  return typeof window !== "undefined" ? ((window as unknown as { ethereum?: Eip1193 }).ethereum ?? null) : null;
}

export const isMiniPay = () => Boolean(injected()?.isMiniPay);

export async function connectWallet(): Promise<Address> {
  const eth = injected();
  if (!eth) throw new Error("No wallet found. Open this page in MiniPay or a browser with a Celo wallet.");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.[0]) throw new Error("Wallet did not share an account");
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xa4ec" }] });
  } catch {
    /* MiniPay is always on Celo; other wallets may refuse, the payment will say so */
  }
  return accounts[0] as Address;
}

export async function usdtBalance(owner: Address): Promise<bigint> {
  const pub = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
  return pub.readContract({ address: USDT, abi: erc20Abi, functionName: "balanceOf", args: [owner] });
}

export function storedAgentKey(): string | null {
  try {
    return localStorage.getItem(AGENT_KEY);
  } catch {
    return null;
  }
}

export async function agentStatus(): Promise<{ address: string; verified: boolean } | null> {
  const key = storedAgentKey();
  if (!key) return null;
  try {
    const agent = new SelfAgent({ privateKey: key, network: "mainnet" });
    const info = await agent.getInfo();
    return { address: agent.address, verified: Boolean(info.isVerified) };
  } catch {
    return null;
  }
}

/** Start Self registration. Returns the link/QR to show; resolves `done` once the passport scan completes. */
export async function startVerification(minAge: number) {
  const session = await requestRegistration({
    mode: "wallet-free",
    network: "mainnet",
    disclosures: minAge > 0 ? { minimumAge: minAge } : {},
  });
  const done = (async () => {
    const result = await session.waitForCompletion({ timeoutMs: 15 * 60_000 });
    const key = await session.exportKey();
    localStorage.setItem(AGENT_KEY, key);
    return result;
  })();
  return { deepLink: session.deepLink, qr: session.scanUrl, done };
}

/** Send a request signed by this device's Self Agent ID key (used for fair-drop entry and result checks). */
async function selfSigned(method: "GET" | "POST", path: string, body = "") {
  const key = storedAgentKey();
  if (!key) throw new Error("Verify with Self first.");
  const agent = new SelfAgent({ privateKey: key, network: "mainnet" });
  const url = `${window.location.origin}${path}`;
  const headers = new Headers(await agent.signRequest(method, url, body));
  if (body) headers.set("content-type", "application/json");
  const res = await fetch(url, { method, headers, body: body || undefined });
  return { ok: res.ok, status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

export const enterDraw = (slug: string) => selfSigned("POST", `/api/events/${slug}/enter`, JSON.stringify({}));
export const checkEntry = (slug: string) => selfSigned("GET", `/api/events/${slug}/entry`);

export interface BuyResult {
  ok: boolean;
  status: number;
  body: {
    ticket?: { id: string; code: string; url: string };
    message?: string;
    reason?: string;
    error?: string;
    [k: string]: unknown;
  };
}

/** Buy one ticket. `maxUsdt` is the exact amount the fan agreed to (6-decimal units). */
export async function buyTicket(slug: string, buyer: Address, maxUsdt: bigint): Promise<BuyResult> {
  const eth = injected();
  if (!eth) throw new Error("No wallet");
  const wallet = createWalletClient({ account: buyer, chain: celo, transport: custom(eth) });

  const client = new x402Client((_v, reqs) => reqs.find((r) => r.asset.toLowerCase() === USDT.toLowerCase()) ?? reqs[0]);
  registerExactEvmScheme(client, {
    signer: {
      address: buyer,
      signTypedData: (m) => wallet.signTypedData({ account: buyer, ...(m as Record<string, unknown>) } as Parameters<typeof wallet.signTypedData>[0]),
    },
  });
  client.setSpendControls({
    maxAmountPerPayment: false,
    allowedAssets: [{ network: "eip155:42220", asset: USDT, maxAmountPerPayment: maxUsdt.toString() }],
  });

  // Every attempt (the unpaid one and the paid retry) gets a fresh Self signature over the exact body.
  const key = storedAgentKey();
  const agent = key ? new SelfAgent({ privateKey: key, network: "mainnet" }) : null;
  const signedFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const body = typeof init?.body === "string" ? init.body : "";
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (agent) for (const [k, v] of Object.entries(await agent.signRequest(method, url, body))) headers.set(k, v);
    return fetch(url, { ...init, method, body: body || undefined, headers });
  };

  const pay = wrapFetchWithPayment(signedFetch, client);
  const url = `${window.location.origin}/api/events/${slug}/buy`;
  const res = await pay(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantity: 1 }) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}
