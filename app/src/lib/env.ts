import { getAddress, isAddress, type Address, type Hex } from "viem";

/**
 * Server configuration. Everything secret stays on the server; nothing here is
 * ever sent to the browser. Missing values switch the matching feature off with
 * a clear error instead of failing silently.
 */
function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** A positive integer env var, falling back (and never NaN) when unset or malformed. */
function intOpt(name: string, fallback: number): number {
  const raw = opt(name);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// Vercel's own signal for "this is the live production deployment" (not a preview, and not a
// local `next build`, which also sets NODE_ENV=production and would otherwise trip this too).
const isLiveProd = process.env.VERCEL_ENV === "production";
const DEV_TICKET_SECRET = "dev-only-ticket-secret-change-me";
// In production, a ticket-signing secret anyone can read on GitHub is as good as no secret at
// all: fail loudly at startup rather than silently signing real tickets with a public key.
if (isLiveProd && !opt("TICKET_SECRET")) {
  throw new Error("TICKET_SECRET must be set in production: it signs every ticket QR code and send-pay order.");
}

export const env = {
  /** Public base URL, e.g. https://kovenra.xyz */
  // SITE_URL wins (it can be stored as a normal setting on Vercel); PUBLIC_BASE_URL is the older name.
  baseUrl: (opt("SITE_URL") ?? opt("PUBLIC_BASE_URL") ?? "http://localhost:3000").replace(/\/$/, ""),
  /** Attribution code issued at hackathon enrollment (ERC-8021). */
  attributionCode: opt("ATTRIBUTION_CODE") ?? "celo_09b3ddb9ca23",
  /** GitHub owner/repo, used to assert the attribution code matches the repo. */
  repoSlug: opt("REPO_SLUG"),
  /** Celo x402 facilitator metering key (created by a human on the dashboard). */
  x402ApiKey: opt("X402_API_KEY"),
  facilitatorUrl: opt("X402_FACILITATOR_URL") ?? "https://api.x402.celo.org",
  /** Kovenra's settlement wallet: receives USD₮ ticket payments, converts on Textile, pays organizers. */
  settlerKey: opt("SETTLER_PRIVATE_KEY") as Hex | undefined,
  rpcUrl: opt("CELO_RPC_URL") ?? "https://forno.celo.org",
  databaseUrl: opt("DATABASE_URL"),
  /** HMAC secret that signs ticket QR codes. Required in production; see the startup check above. */
  ticketSecret: opt("TICKET_SECRET") ?? DEV_TICKET_SECRET,
  /** Self verifier: max agents one human may register and still be served. */
  selfMaxAgentsPerHuman: intOpt("SELF_MAX_AGENTS_PER_HUMAN", 10),
  /** Extra USD₮ charged over the live mid rate so the conversion always covers the naira price. */
  fxBufferBps: intOpt("FX_BUFFER_BPS", 60),
  /** Kovenra's own agent ID in the Self Agent ID registry (an ERC-8004 registry). Public. */
  agentId: opt("KOVENRA_AGENT_ID") ? Number(opt("KOVENRA_AGENT_ID")) : undefined,
  /** Kovenra's agent address in that registry. Public. */
  agentAddress: opt("KOVENRA_AGENT_ADDRESS"),
  /** Kovenra's agent ID in the official ERC-8004 Identity Registry (found on-chain if unset). Public. */
  erc8004AgentId: opt("ERC8004_AGENT_ID"),
};

export function settlerAddressFromEnv(): Address | undefined {
  const a = opt("SETTLER_ADDRESS");
  return a && isAddress(a) ? getAddress(a) : undefined;
}

export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const v = env[key];
  if (v === undefined || v === null || v === "") throw new Error(`Missing server setting: ${String(key)}`);
  return v as NonNullable<(typeof env)[K]>;
}
