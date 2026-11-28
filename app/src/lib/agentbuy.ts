import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { decodePaymentResponseHeader, wrapFetchWithPayment } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "./env";

/**
 * Kovenra's agent buying services for itself, over x402 on Celo, through buy
 * (usebuy.ai, Celo's agent service marketplace). The agent wallet pays a few
 * cents per check, with a hard cap per call, so organizers and fans get two
 * safety checks no other ticket site here does:
 *
 *  1. Organizer check: before fans trust an event, the agent reads the
 *     organizer's public Instagram or X profile and shows what it found
 *     (fake-event scams usually come from new or empty accounts).
 *  2. Payout wallet check: before sending naira to a new organizer wallet, the
 *     agent screens it against OFAC's sanctioned crypto addresses.
 */
const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
/** Hard cap per call: 2 US cents. Every check here is priced at 0.2 to 0.5 cents. */
const MAX_PER_CALL = 20_000n;

export interface PaidResult<T> {
  data: T;
  /** Settlement transaction on Celo, when the seller returns one. */
  paymentTx: string | null;
  priceUsd: string;
  service: string;
  at: string;
}

export type Fetcher = typeof fetch;

function payingFetch(base: Fetcher = fetch): Fetcher {
  if (!env.settlerKey) throw new Error("SETTLER_PRIVATE_KEY is not set");
  const account = privateKeyToAccount(env.settlerKey);
  // Prefer USD₮ (what Kovenra earns); fall back to USDC when a seller only takes that.
  const client = new x402Client((_v, reqs) => {
    const celo = reqs.filter((r) => r.network === "eip155:42220");
    return celo.find((r) => r.asset.toLowerCase() === USDT.toLowerCase()) ?? celo.find((r) => r.asset.toLowerCase() === USDC.toLowerCase()) ?? celo[0] ?? reqs[0];
  });
  // Scope the signer to Celo only: with no `networks` option this would register for every EVM
  // chain ("eip155:*"), and the fallback selector above (`celo[0] ?? reqs[0]`) would then be able
  // to pick (and this wallet able to sign) a 402 offer on a different chain entirely.
  registerExactEvmScheme(client, { signer: account, networks: ["eip155:42220"] });
  client.setSpendControls({
    // A top-level USD cap, not `false`: with it disabled, a requirement in a *default* asset
    // (e.g. USDC on Base/Ethereum, which @x402/evm recognizes out of the box) that isn't one of
    // the two explicit Celo entries below resolves to an *uncapped* spend cap, not a rejected
    // one — the per-call limit here is the only thing standing between this wallet and an
    // unbounded payment. The network restriction above should already keep that from ever being
    // selectable; this is the second, independent layer in case it somehow isn't.
    maxAmountPerPayment: "$0.02",
    allowedAssets: [
      { network: "eip155:42220", asset: USDT, maxAmountPerPayment: MAX_PER_CALL.toString() },
      { network: "eip155:42220", asset: USDC, maxAmountPerPayment: MAX_PER_CALL.toString() },
    ],
  });
  return wrapFetchWithPayment(base, client) as Fetcher;
}

function settledTx(res: Response): string | null {
  const h = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
  if (!h) return null;
  try {
    const s = decodePaymentResponseHeader(h) as { transaction?: string };
    return s.transaction ?? null;
  } catch {
    return null;
  }
}

async function paidCall<T>(service: string, url: string, init: RequestInit, priceUsd: string, base?: Fetcher): Promise<PaidResult<T>> {
  const headers = new Headers(init.headers);
  // buy links paid calls to the payer's ERC-8004 identity when this header is present.
  headers.set("X-8004-Agent-Id", env.erc8004AgentId ?? "10137");
  const res = await payingFetch(base)(url, { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${service} answered ${res.status}`);
  return { data: body as T, paymentTx: settledTx(res), priceUsd, service, at: new Date().toISOString() };
}

// ---------------------------------------------------------------- organizer check

export type SocialPlatform = "instagram" | "x";

export interface OrganizerCheck {
  platform: SocialPlatform;
  handle: string;
  found: boolean;
  name?: string;
  followers?: number;
  verified?: boolean;
  posts?: number;
  paymentTx: string | null;
  priceUsd: string;
  checkedAt: string;
}

export function cleanHandle(h: string) {
  return h.trim().replace(/^https?:\/\/(www\.)?(instagram\.com|x\.com|twitter\.com)\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : undefined);

/** Find the first value for any of these keys anywhere in a nested object (provider shapes differ). */
export function pick(o: unknown, keys: string[], depth = 0): unknown {
  if (!o || typeof o !== "object" || depth > 6) return undefined;
  for (const k of keys) if (k in (o as Record<string, unknown>) && (o as Record<string, unknown>)[k] != null) return (o as Record<string, unknown>)[k];
  for (const v of Object.values(o as Record<string, unknown>)) {
    const r = pick(v, keys, depth + 1);
    if (r !== undefined) return r;
  }
  return undefined;
}

export function readProfile(platform: SocialPlatform, handle: string, data: unknown): Omit<OrganizerCheck, "paymentTx" | "priceUsd" | "checkedAt"> {
  const followers = num(pick(data, platform === "x" ? ["followers_count", "followers", "sub_count"] : ["follower_count", "followers", "followers_count", "edge_followed_by"]))
    ?? num(pick(pick(data, ["edge_followed_by"]), ["count"]));
  const name = pick(data, ["full_name", "name", "display_name"]);
  const verified = pick(data, ["is_verified", "verified", "is_blue_verified", "blue_verified"]);
  const posts = num(pick(data, platform === "x" ? ["statuses_count", "tweets"] : ["media_count", "posts"])) ?? num(pick(pick(data, ["edge_owner_to_timeline_media"]), ["count"]));
  const found = followers !== undefined || typeof name === "string";
  return { platform, handle, found, name: typeof name === "string" ? name.slice(0, 80) : undefined, followers, verified: typeof verified === "boolean" ? verified : undefined, posts };
}

export async function checkOrganizer(platform: SocialPlatform, rawHandle: string, base?: Fetcher): Promise<OrganizerCheck> {
  const handle = cleanHandle(rawHandle);
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) throw new Error("Not a valid handle");
  const r =
    platform === "instagram"
      ? await paidCall<unknown>("buy · Instagram profile", "https://gateway.usebuy.ai/v1/social/instagram/profile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username: handle }),
        }, "0.005", base)
      : await paidCall<unknown>("buy · X profile", "https://gateway.usebuy.ai/v1/social/x/tools/tikhub-api-v1-twitter-web-fetch-user-profile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ queryParams: { screen_name: handle } }),
        }, "0.005", base);
  return { ...readProfile(platform, handle, r.data), paymentTx: r.paymentTx, priceUsd: r.priceUsd, checkedAt: r.at };
}

// ---------------------------------------------------------------- payout wallet check

export interface WalletCheck {
  address: string;
  sanctioned: boolean;
  match?: string;
  paymentTx: string | null;
  priceUsd: string;
  checkedAt: string;
}

export async function screenWallet(address: string, base?: Fetcher): Promise<WalletCheck> {
  const r = await paidCall<Record<string, unknown>>(
    "buy · OFAC wallet screening",
    `https://agent402.tools/api/sanctions/wallet?address=${encodeURIComponent(address)}`,
    { method: "GET" },
    "0.002",
    base,
  );
  const hit = pick(r.data, ["sanctioned", "match", "matched", "isSanctioned", "listed"]);
  const sanctioned = hit === true || (typeof hit === "object" && hit !== null);
  const entity = pick(r.data, ["entity", "name", "sdnName"]);
  return { address, sanctioned, match: sanctioned && typeof entity === "string" ? entity : undefined, paymentTx: r.paymentTx, priceUsd: r.priceUsd, checkedAt: r.at };
}
