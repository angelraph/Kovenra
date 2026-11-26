import { SELF_REGISTRY, TOKENS } from "./chain";
import { env, settlerAddressFromEnv } from "./env";

/**
 * Kovenra's ERC-8004 registration document.
 *
 * The same JSON is served at /.well-known/agent-registration.json (ERC-8004),
 * /.well-known/agent-card.json (A2A) and /agent.json, and written on-chain to
 * Kovenra's entry in the Self Agent ID registry by `npm run agent:card`.
 * Everything in it is public.
 */
export function kovenraAgentDocument(base = env.baseUrl) {
  const registrations = env.agentId ? [{ agentId: env.agentId, agentRegistry: `eip155:42220:${SELF_REGISTRY}` }] : [];
  const payTo = settlerAddressFromEnv();
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1" as const,
    name: "Kovenra",
    description:
      "Fair event tickets for real people across Nigeria. One ticket per verified human (Self Agent ID), paid over x402 in USD₮ or cNGN on Celo. USD₮ is converted to naira on Textile FX and paid to the organizer in seconds.",
    image: `${base}/brand/kovenra-icon-512.png`,
    active: true,
    version: "1.0.0",
    url: base,
    services: [
      { name: "web", endpoint: base },
      { name: "agent-skill", endpoint: `${base}/skill.md` },
      { name: "events-api", endpoint: `${base}/api/events` },
      { name: "x402-buy", endpoint: `${base}/api/events/{slug}/buy` },
      { name: "proof", endpoint: `${base}/proof` },
    ],
    registrations,
    supportedTrust: ["crypto-economic"] as const,
    provider: { organization: "Kovenra", url: base },
    documentationUrl: `${base}/agents`,
    iconUrl: `${base}/brand/kovenra-icon-512.png`,
    defaultInputModes: ["application/json"],
    defaultOutputModes: ["application/json"],
    skills: [
      {
        id: "buy-ticket",
        name: "Buy a fair ticket",
        description: "Buy one event ticket for the verified human behind your Self Agent ID. Pay the 402 in USD₮ or cNGN; get a single-use QR ticket back.",
        tags: ["tickets", "events", "x402", "self-agent-id", "naira", "celo"],
      },
      {
        id: "list-events",
        name: "List upcoming events",
        description: "Upcoming events with naira price, live USD₮ price, seats left and per-person limits.",
        tags: ["events", "nigeria"],
      },
    ],
    x402: {
      network: "eip155:42220",
      facilitator: env.facilitatorUrl,
      accepts: [
        { asset: TOKENS.USDT.address, symbol: "USD₮", scheme: "exact", transfer: "eip3009", payTo: payTo ?? null },
        { asset: TOKENS.CNGN.address, symbol: "cNGN", scheme: "exact", transfer: "permit2", payTo: "organizer" },
      ],
    },
    selfAgentId: {
      registry: SELF_REGISTRY,
      agentId: env.agentId ?? null,
      agentAddress: env.agentAddress ?? null,
      requiresVerifiedHuman: true,
    },
    attribution: { erc8021: env.attributionCode },
  };
}
