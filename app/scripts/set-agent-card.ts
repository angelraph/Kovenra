/**
 * Write Kovenra's ERC-8004 registration document on-chain, into its entry in the
 * Self Agent ID registry on Celo mainnet. Run after `npm run agent:register`.
 *
 *   npm run agent:card            shows the document and the cost, asks before sending
 *   npm run agent:card -- --check only reads what is on-chain now
 *
 * The transaction is sent from Kovenra's agent key (it owns its registry entry)
 * and carries the ERC-8021 attribution tag.
 */
import { createPublicClient, createWalletClient, encodeFunctionData, formatEther, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { arg, bad, confirm, loadEnv, note, ok, readAgent, say } from "./_lib";

const REGISTRY = "0xaC3DF9ABf80d0F5c020C06B04Cced27763355944" as const;
const ABI = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getAgentMetadata(uint256 agentId) view returns (string)",
  "function updateAgentMetadata(uint256 agentId, string metadata)",
  "function hasHumanProof(uint256 agentId) view returns (bool)",
]);

async function main() {
  loadEnv();
  const saved = readAgent("kovenra");
  if (!saved) throw new Error('No Kovenra agent yet. Run "npm run agent:register" first.');
  // The document reads these at import time, so set them before importing it.
  process.env.KOVENRA_AGENT_ID ??= String(saved.agentId);
  process.env.KOVENRA_AGENT_ADDRESS ??= saved.agentAddress;
  const base = (arg("base") ?? process.env.PUBLIC_BASE_URL ?? "https://kovenra.vercel.app").replace(/\/$/, "");
  process.env.PUBLIC_BASE_URL = base;
  const { kovenraAgentDocument } = await import("../src/lib/agentCard");
  const { tagCalldata } = await import("../src/lib/attribution");

  const rpc = process.env.CELO_RPC_URL ?? "https://forno.celo.org";
  const pub = createPublicClient({ chain: celo, transport: http(rpc) });
  const id = BigInt(saved.agentId);

  const [owner, human, current] = await Promise.all([
    pub.readContract({ address: REGISTRY, abi: ABI, functionName: "ownerOf", args: [id] }),
    pub.readContract({ address: REGISTRY, abi: ABI, functionName: "hasHumanProof", args: [id] }),
    pub.readContract({ address: REGISTRY, abi: ABI, functionName: "getAgentMetadata", args: [id] }).catch(() => ""),
  ]);
  say(`\nKovenra agent #${saved.agentId} · ${saved.agentAddress}`);
  human ? ok("Verified human behind it") : bad("No human proof on-chain");
  note(`Registry entry owner: ${owner}`);
  note(current ? `On-chain card now: ${current.length} characters` : "No card on-chain yet");

  const doc = kovenraAgentDocument(base);
  const json = JSON.stringify(doc);
  if (arg("check")) {
    if (current) say(`\n${JSON.stringify(JSON.parse(current), null, 2)}\n`);
    return;
  }
  if (current === json) {
    ok("The on-chain card already matches. Nothing to do.");
    return;
  }

  const account = privateKeyToAccount(saved.privateKey as Hex);
  if (owner.toLowerCase() !== account.address.toLowerCase()) throw new Error("This agent key does not own the registry entry, so it can't update the card.");

  const data = tagCalldata(encodeFunctionData({ abi: ABI, functionName: "updateAgentMetadata", args: [id, json] }));
  const [gas, gasPrice, balance] = await Promise.all([
    pub.estimateGas({ account: account.address, to: REGISTRY, data }),
    pub.getGasPrice(),
    pub.getBalance({ address: account.address }),
  ]);
  const cost = (gas * gasPrice * 12n) / 10n;
  say(`\nDocument (${json.length} characters):\n${JSON.stringify(doc, null, 2)}\n`);
  note(`Estimated cost: about ${Number(formatEther(cost)).toFixed(4)} CELO · balance ${Number(formatEther(balance)).toFixed(4)} CELO`);
  if (balance < cost) throw new Error(`Not enough CELO. Send at least ${Number(formatEther(cost - balance)).toFixed(4)} CELO to ${account.address} and run this again.`);

  if (!(await confirm("This sends one transaction on Celo mainnet."))) {
    say("Stopped. Nothing was sent.");
    return;
  }
  const wallet = createWalletClient({ account, chain: celo, transport: http(rpc) });
  const hash = await wallet.sendTransaction({ to: REGISTRY, data, gas: (gas * 12n) / 10n });
  say(`Sent: https://celoscan.io/tx/${hash}`);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  receipt.status === "success" ? ok("Kovenra's ERC-8004 card is now on-chain.") : bad("The transaction failed.");
}

main().catch((e) => {
  bad(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
