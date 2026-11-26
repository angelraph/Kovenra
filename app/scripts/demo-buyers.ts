/**
 * Three (plus one) buyers against the live ticket counter, to show the rules working:
 *
 *   1. A plain bot with no Self Agent ID              → 403, turned away before payment
 *   2. A bot with a made-up signature                 → 403, signature not in the registry
 *   3. A verified person's agent (demo-1)             → 402 price quote, or a real ticket with --pay
 *   4. The same person's second agent (demo-2)        → 429, shares the one-ticket limit
 *
 *   npm run demo:buyers -- --event <slug>             identity checks only, no money moves
 *   npm run demo:buyers -- --event <slug> --pay       buyer 3 really pays (needs DEMO_PAYER_KEY with USD₮)
 *   npm run demo:buyers -- --base http://localhost:3000 --event <slug>
 *
 * Agents come from `npm run agent:register -- --name demo-1` and `--name demo-2`
 * (scan the same passport for both). Results are saved to app/.agent/demo-results.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SelfAgent } from "@selfxyz/agent-sdk";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { AGENT_DIR, arg, bad, confirm, loadEnv, note, ok, readAgent, say } from "./_lib";

const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
type Row = { buyer: string; expected: string; got: number; pass: boolean; detail: string };

async function main() {
  loadEnv();
  const base = (arg("base") ?? process.env.PUBLIC_BASE_URL ?? "https://kovenra.vercel.app").replace(/\/$/, "");
  let slug = arg("event");
  if (!slug || slug === "true") {
    const list = (await (await fetch(`${base}/api/events`)).json()) as { events: { slug: string; title: string; humansOnly: boolean }[] };
    const pick = list.events.find((e) => e.humansOnly);
    if (!pick) throw new Error(`No verified-humans event on ${base}. Create one at ${base}/new, then pass --event <slug>.`);
    slug = pick.slug;
  }
  const event = (await (await fetch(`${base}/api/events/${slug}`)).json()) as { title: string; priceLabel: string; priceUsdt: string | null; perPersonLimit: number; humansOnly: boolean };
  if (!event.title) throw new Error(`Event "${slug}" not found on ${base}`);
  const url = `${base}/api/events/${slug}/buy`;
  const body = JSON.stringify({ quantity: 1 });
  say(`\nKovenra demo buyers · ${event.title} · ${event.priceLabel}${event.priceUsdt ? ` (≈ ${event.priceUsdt} USD₮)` : ""} · ${event.perPersonLimit} per person`);
  say(`Counter: ${url}\n`);
  if (!event.humansOnly) note("This event has the verified-humans rule switched off, so buyers 1 and 2 won't be refused.");

  const rows: Row[] = [];
  const record = (buyer: string, expected: string, got: number, pass: boolean, detail: string) => {
    rows.push({ buyer, expected, got, pass, detail });
    (pass ? ok : bad)(`${buyer}: ${got} ${detail}`);
  };
  const post = (headers: Record<string, string> = {}) => fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
  const signed = async (agent: SelfAgent) => post(await agent.signRequest("POST", url, body));

  // 1. Plain bot
  {
    const r = await post();
    const j = (await r.json().catch(() => ({}))) as { reason?: string; error?: string };
    record("1 · Plain bot (no Self Agent ID)", "403", r.status, r.status === 403, j.reason ?? j.error ?? "");
  }

  // 2. Bot with a made-up agent key that no human ever registered
  {
    const fake = new SelfAgent({ privateKey: generatePrivateKey(), network: "mainnet" });
    const r = await signed(fake);
    const j = (await r.json().catch(() => ({}))) as { reason?: string; error?: string };
    record("2 · Bot with an unregistered key", "403", r.status, r.status === 403, j.reason ?? j.error ?? "");
  }

  // 3. Verified person's agent
  const a1 = readAgent("demo-1") ?? readAgent("kovenra");
  const a2 = readAgent("demo-2");
  if (!a1) {
    note('Buyer 3 skipped: register one with "npm run agent:register -- --name demo-1".');
  } else {
    const agent = new SelfAgent({ privateKey: a1.privateKey, network: "mainnet" });
    const pay = arg("pay") === "true";
    if (!pay) {
      const r = await signed(agent);
      const j = (await r.json().catch(() => ({}))) as { kovenra?: { priceUsdt?: string }; error?: string; message?: string };
      const passed = r.status === 402 || r.status === 503;
      record(`3 · Verified agent #${a1.agentId}`, "402 (identity passed)", r.status, passed,
        r.status === 402 ? `price quoted: ${(Number(j.kovenra?.priceUsdt ?? 0) / 1e6).toFixed(2)} USD₮` : (j.message ?? j.error ?? ""));
    } else {
      const payerKey = process.env.DEMO_PAYER_KEY as Hex | undefined;
      if (!payerKey) throw new Error("--pay needs DEMO_PAYER_KEY in app/.env.local (a wallet holding a little USD₮).");
      const payer = privateKeyToAccount(payerKey);
      const cap = BigInt(Math.ceil(Number(event.priceUsdt ?? "0") * 1e6 * 1.02));
      if (!cap) throw new Error("Couldn't read the USD₮ price for this event.");
      if (!(await confirm(`Buyer 3 will pay up to ${(Number(cap) / 1e6).toFixed(2)} USD₮ from ${payer.address} on Celo mainnet.`))) return;
      const client = new x402Client((_v, reqs) => reqs.find((q) => q.asset.toLowerCase() === USDT.toLowerCase()) ?? reqs[0]);
      registerExactEvmScheme(client, { signer: payer });
      client.setSpendControls({ maxAmountPerPayment: false, allowedAssets: [{ network: "eip155:42220", asset: USDT, maxAmountPerPayment: cap.toString() }] });
      const signedFetch: typeof fetch = async (input, init) => {
        const u = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const h = new Headers(init?.headers);
        for (const [k, v] of Object.entries(await agent.signRequest(init?.method ?? "POST", u, String(init?.body ?? "")))) h.set(k, v);
        return fetch(u, { ...init, headers: h });
      };
      const r = await wrapFetchWithPayment(signedFetch, client)(url, { method: "POST", headers: { "content-type": "application/json" }, body });
      const j = (await r.json().catch(() => ({}))) as { ticket?: { url: string; paid?: { tx: string } }; message?: string; error?: string };
      record(`3 · Verified agent #${a1.agentId} (paid)`, "200 ticket", r.status, r.status === 200,
        j.ticket ? `ticket ${j.ticket.url} · tx https://celoscan.io/tx/${j.ticket.paid?.tx}` : (j.message ?? j.error ?? ""));
    }
  }

  // 4. Same person's second agent
  if (!a2) {
    note('Buyer 4 skipped: register a second agent with the same passport: "npm run agent:register -- --name demo-2".');
  } else if (a1) {
    const agent = new SelfAgent({ privateKey: a2.privateKey, network: "mainnet" });
    const r = await signed(agent);
    const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
    record(`4 · Same person's 2nd agent #${a2.agentId}`, "429", r.status, r.status === 429, j.error ?? j.message ?? "");
  }

  mkdirSync(AGENT_DIR, { recursive: true });
  const out = join(AGENT_DIR, "demo-results.json");
  writeFileSync(out, JSON.stringify({ base, event: slug, at: new Date().toISOString(), rows }, null, 2));
  const passed = rows.filter((r) => r.pass).length;
  say(`\n${passed} of ${rows.length} checks behaved as expected. Saved to app/.agent/demo-results.json`);
  say(`Every refusal shows up on ${base} (live board) and in the organizer's dashboard.\n`);
  if (passed !== rows.length) process.exit(1);
}

main().catch((e) => {
  bad(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
