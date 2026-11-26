/**
 * Register an agent in the Self Agent ID registry on Celo mainnet (an ERC-8004 registry).
 *
 *   npm run agent:register              Kovenra's own agent identity
 *   npm run agent:register -- --name demo-1   a demo buyer agent (for the demo video)
 *   npm run agent:register -- --name demo-2   a second agent for the same person
 *
 * You scan your passport in the Self app once per agent. Self keeps the passport
 * details on your phone; the registry only learns that a unique human stands
 * behind the agent. The agent key is saved in app/.agent/<name>.json (never committed).
 */
import { exec } from "node:child_process";
import { SelfAgent } from "@selfxyz/agent-sdk";
import { requestRegistration } from "@selfxyz/agent-sdk/dist/registration-flow.js";
import { bad, loadEnv, note, ok, readAgent, saveAgent, say, arg } from "./_lib";

async function main() {
  loadEnv();
  const name = arg("name") ?? "kovenra";
  if (!/^[a-z0-9-]{2,30}$/.test(name)) throw new Error("--name can only use lowercase letters, numbers and dashes");

  const existing = readAgent(name);
  if (existing) {
    const agent = new SelfAgent({ privateKey: existing.privateKey, network: "mainnet" });
    const info = await agent.getInfo();
    say(`\nAgent "${name}" is already registered.`);
    ok(`Agent #${existing.agentId} · ${existing.agentAddress}`);
    info.isVerified ? ok("Verified human behind it") : bad("Not verified (the proof may have expired)");
    printNext(name, existing.agentId, existing.agentAddress);
    return;
  }

  say(`\nRegistering "${name}" in the Self Agent ID registry on Celo mainnet…`);
  const session = await requestRegistration({ mode: "wallet-free", network: "mainnet", disclosures: {} });
  say("\n1. Open the Self app on your phone (get it from your app store if you don't have it).");
  say("2. Scan this QR code, or open the link on your phone:\n");
  say(`   QR:   ${session.scanUrl}`);
  say(`   Link: ${session.deepLink}\n`);
  for (const line of session.humanInstructions ?? []) note(line);
  // Open the QR image so it can be scanned straight from the screen.
  const opener = process.platform === "win32" ? `start "" "${session.scanUrl}"` : process.platform === "darwin" ? `open "${session.scanUrl}"` : `xdg-open "${session.scanUrl}"`;
  exec(opener, () => undefined);

  say("\nWaiting for the passport scan (up to 30 minutes)…");
  const result = await session.waitForCompletion({ timeoutMs: 30 * 60_000 });
  const privateKey = await session.exportKey();
  saveAgent({ name, agentId: result.agentId, agentAddress: result.agentAddress, privateKey, registeredAt: new Date().toISOString() });
  ok(`Registered: agent #${result.agentId} · ${result.agentAddress}`);
  ok(`Key saved to app/.agent/${name}.json (keep this file private)`);
  printNext(name, result.agentId, result.agentAddress);
}

function printNext(name: string, agentId: number, address: string) {
  if (name !== "kovenra") {
    say("\nThis agent can now be used by: npm run demo:buyers\n");
    return;
  }
  say("\nNext:");
  say("  • In Vercel → Settings → Environment Variables, add (these are public, not secret):");
  say(`      KOVENRA_AGENT_ID       = ${agentId}`);
  say(`      KOVENRA_AGENT_ADDRESS  = ${address}`);
  say(`  • Send about 1 CELO to ${address} for gas, then write the ID card on-chain:`);
  say("      npm run agent:card\n");
}

main().catch((e) => {
  bad(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
