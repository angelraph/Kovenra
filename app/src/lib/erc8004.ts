import { createPublicClient, createWalletClient, decodeEventLog, encodeFunctionData, http, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { tagCalldata } from "./attribution";
import { env } from "./env";

/**
 * Kovenra's identity in the official ERC-8004 Identity Registry on Celo mainnet
 * (the registry the hackathon requires). The agent wallet is Kovenra's
 * settlement wallet, so the identity, the x402 PayTo address and the wallet
 * that sends every tagged transaction are the same address.
 */
export const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Address;

const ABI = parseAbi([
  "function register(string agentURI) returns (uint256 agentId)",
  "function setAgentURI(uint256 agentId, string newURI)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

function clients() {
  if (!env.settlerKey) throw new Error("SETTLER_PRIVATE_KEY is not set");
  const account = privateKeyToAccount(env.settlerKey);
  const transport = http(env.rpcUrl);
  return {
    account,
    pub: createPublicClient({ chain: celo, transport }),
    wallet: createWalletClient({ account, chain: celo, transport }),
  };
}

export const agentURI = () => `${env.baseUrl}/.well-known/agent-registration.json`;

/** Find Kovenra's agent ID from the registry's Transfer logs (cached), so no extra setting is needed. */
let idCache: { id: string | null; at: number } | null = null;
export async function findAgentId(): Promise<string | null> {
  if (env.erc8004AgentId) return env.erc8004AgentId;
  if (idCache && (idCache.id || Date.now() - idCache.at < 60_000)) return idCache.id;
  if (!env.settlerKey && !env.agentAddress) return null;
  const owner = env.settlerKey ? privateKeyToAccount(env.settlerKey).address : null;
  if (!owner) return null;
  const pub = createPublicClient({ chain: celo, transport: http(env.rpcUrl) });
  const latest = await pub.getBlockNumber();
  const event = ABI.find((x) => x.type === "event" && x.name === "Transfer")!;
  let id: string | null = null;
  // Walk back in 5,000-block chunks (Forno's limit), about a day and a half.
  // Set ERC8004_AGENT_ID once registered so this never has to run.
  for (let to = latest; to > latest - 120_000n && !id; to -= 5_000n) {
    const from = to - 4_999n;
    const logs = await pub
      .getLogs({ address: IDENTITY_REGISTRY, event: event as never, args: { to: owner } as never, fromBlock: from, toBlock: to })
      .catch(() => []);
    const last = logs[logs.length - 1] as unknown as { args?: { tokenId?: bigint } } | undefined;
    if (last?.args?.tokenId !== undefined) id = last.args.tokenId.toString();
  }
  idCache = { id, at: Date.now() };
  return id;
}

export async function identityStatus() {
  const { account, pub } = clients();
  const [owned, balance] = await Promise.all([
    pub.readContract({ address: IDENTITY_REGISTRY, abi: ABI, functionName: "balanceOf", args: [account.address] }),
    pub.getBalance({ address: account.address }),
  ]);
  const id = owned > 0n ? await findAgentId() : null;
  let uri: string | null = null;
  if (id) {
    uri = await pub.readContract({ address: IDENTITY_REGISTRY, abi: ABI, functionName: "tokenURI", args: [BigInt(id)] }).catch(() => null);
  }
  return {
    registry: IDENTITY_REGISTRY,
    agentWallet: account.address,
    registered: owned > 0n,
    agentId: id,
    agentURI: uri,
    expectedURI: agentURI(),
    celoBalanceWei: balance.toString(),
  };
}

/** Register Kovenra once. Refuses to register twice from the same wallet. */
export async function registerIdentity(): Promise<{ tx: Hex; agentId: string }> {
  const { account, pub, wallet } = clients();
  const owned = await pub.readContract({ address: IDENTITY_REGISTRY, abi: ABI, functionName: "balanceOf", args: [account.address] });
  if (owned > 0n) throw new Error("Kovenra's wallet already holds an ERC-8004 identity.");
  const data = tagCalldata(encodeFunctionData({ abi: ABI, functionName: "register", args: [agentURI()] }));
  const tx = await wallet.sendTransaction({ to: IDENTITY_REGISTRY, data, account, chain: celo });
  const receipt = await pub.waitForTransactionReceipt({ hash: tx });
  if (receipt.status !== "success") throw new Error(`Registration transaction failed: ${tx}`);
  let agentId = "";
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== IDENTITY_REGISTRY.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi: ABI, data: log.data, topics: log.topics });
      if (ev.eventName === "Transfer" && ev.args.to.toLowerCase() === account.address.toLowerCase()) agentId = ev.args.tokenId.toString();
    } catch {
      /* other events */
    }
  }
  return { tx, agentId };
}

/** Point the identity at the current site address (after a domain change). */
export async function updateIdentityURI(): Promise<Hex> {
  const id = await findAgentId();
  if (!id) throw new Error("Kovenra isn't registered yet");
  const { account, pub, wallet } = clients();
  const data = tagCalldata(encodeFunctionData({ abi: ABI, functionName: "setAgentURI", args: [BigInt(id), agentURI()] }));
  const tx = await wallet.sendTransaction({ to: IDENTITY_REGISTRY, data, account, chain: celo });
  await pub.waitForTransactionReceipt({ hash: tx });
  return tx;
}
