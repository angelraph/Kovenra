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

export const env = {
  /** Public base URL, e.g. https://kovenra.xyz */
  baseUrl: opt("PUBLIC_BASE_URL") ?? "http://localhost:3000",
  /** Attribution code issued at hackathon enrollment (ERC-8021). */
  attributionCode: opt("ATTRIBUTION_CODE") ?? "celo_test1234",
  /** GitHub owner/repo, used to assert the attribution code matches the repo. */
  repoSlug: opt("REPO_SLUG"),
  /** Celo x402 facilitator metering key (created by a human on the dashboard). */
  x402ApiKey: opt("X402_API_KEY"),
  facilitatorUrl: opt("X402_FACILITATOR_URL") ?? "https://api.x402.celo.org",
  /** Kovenra's settlement wallet: receives USD₮ ticket payments, converts on Textile, pays organizers. */
  settlerKey: opt("SETTLER_PRIVATE_KEY") as Hex | undefined,
  rpcUrl: opt("CELO_RPC_URL") ?? "https://forno.celo.org",
  databaseUrl: opt("DATABASE_URL"),
  /** HMAC secret that signs ticket QR codes. */
  ticketSecret: opt("TICKET_SECRET") ?? "dev-only-ticket-secret-change-me",
  /** Self verifier: max agents one human may register and still be served. */
  selfMaxAgentsPerHuman: Number(opt("SELF_MAX_AGENTS_PER_HUMAN") ?? "10"),
  /** Extra USD₮ charged over the live mid rate so the conversion always covers the naira price. */
  fxBufferBps: Number(opt("FX_BUFFER_BPS") ?? "60"),
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
