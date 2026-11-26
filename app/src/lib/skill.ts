/** The agent skill file, served at /skill.md with this site's own address filled in. */
export function skillMarkdown(base: string, agentId?: number) {
  return `---
name: kovenra-tickets
description: Buy event tickets on Kovenra (Celo mainnet) for the human you work for. Requires a Self Agent ID with a verified human behind it; pays over x402 in USD₮ or cNGN.
---

# Kovenra: buy a ticket for your human

Kovenra sells event tickets one per verified person. Your agent can buy if a real,
unique human stands behind it (Self Agent ID on Celo mainnet). All agents that
belong to the same human share one per-person limit.

Kovenra's own identity: ERC-8004 registration document at ${base}/.well-known/agent-registration.json${agentId ? ` (Self Agent ID registry, agent #${agentId})` : ""}.

## 1. Find an event

\`\`\`
GET ${base}/api/events
GET ${base}/api/events/{slug}
\`\`\`

Each event returns \`priceNgn\` (cNGN, 6 decimals), \`priceUsdt\` (today's USD₮ price),
\`remaining\`, \`perPersonLimit\`, \`minAge\` and \`humansOnly\`.

## 2. Buy

\`\`\`
POST ${base}/api/events/{slug}/buy
content-type: application/json
x-self-agent-address / x-self-agent-signature / x-self-agent-timestamp   (sign the exact body)
PAYMENT-SIGNATURE: <x402 v2 payload>     (on the retry)
\`\`\`

- Without a payment header you get \`402\` with two options: USD₮ (EIP-3009, gasless)
  or cNGN (Permit2, paid straight to the organizer).
- Use \`@x402/fetch\` with \`@x402/evm\` and sign Self headers on every attempt with
  \`@selfxyz/agent-sdk\` (\`SelfAgent.signRequest\`). Raise the x402 client spend cap
  to the ticket price (the default cap is $1).

## Responses

| Status | Meaning |
| --- | --- |
| 200 | \`{ ticket: { id, code, url } }\`. Give \`url\` to your human: it's their QR ticket. |
| 402 | Pay the offer and retry. |
| 403 \`human_verification_required\` | Your agent has no verified human (or the human is under \`minAge\`). Register at https://docs.self.xyz/agent-id/quickstart |
| 429 \`per_person_limit\` | Your human already holds the maximum. Their other agents share this limit. |
| 409 \`sold_out\` | No seats left. |

## Example (TypeScript)

\`\`\`ts
import { SelfAgent } from "@selfxyz/agent-sdk";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";

const agent = new SelfAgent({ privateKey: process.env.AGENT_KEY!, network: "mainnet" });
const payer = privateKeyToAccount(process.env.PAYER_KEY! as \`0x\${string}\`);
const client = new x402Client();
registerExactEvmScheme(client, { signer: payer });
client.setSpendControls({ maxAmountPerPayment: false, allowedAssets: [{ network: "eip155:42220", asset: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", maxAmountPerPayment: "20000000" }] });

const signed: typeof fetch = async (url, init) => {
  const body = String(init?.body ?? "");
  const h = new Headers(init?.headers);
  for (const [k, v] of Object.entries(await agent.signRequest(init?.method ?? "GET", String(url), body))) h.set(k, v);
  return fetch(url, { ...init, headers: h });
};
const res = await wrapFetchWithPayment(signed, client)("${base}/api/events/SLUG/buy", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantity: 1 }),
});
console.log(await res.json());
\`\`\`
`;
}
