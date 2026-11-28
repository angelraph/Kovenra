import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  http,
  maxUint256,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { tagCalldata } from "./attribution";
import { TOKENS } from "./chain";
import { env } from "./env";
import type { Store, TicketRec } from "./store";
import { requestFirmQuote, submitSwap, type FirmQuote, type QuoteSigner } from "./textile";

/**
 * Settlement: a ticket paid in USD₮ lands in Kovenra's settlement wallet.
 * We convert exactly that USD₮ to cNGN on Textile FX and send the naira to the
 * organizer's own wallet. Every transaction (approve, swap, payout) carries the
 * ERC-8021 tag. Tickets paid in cNGN go straight to the organizer via x402, so
 * there is nothing to settle ("direct").
 */
export interface Chain {
  address: Address;
  allowance(token: Address, spender: Address): Promise<bigint>;
  /** Send a tagged transaction and wait for one confirmation. */
  send(to: Address, data: Hex): Promise<Hex>;
  signTyped: QuoteSigner;
}

export function liveChain(): Chain {
  if (!env.settlerKey) throw new Error("SETTLER_PRIVATE_KEY is not set");
  const account: PrivateKeyAccount = privateKeyToAccount(env.settlerKey);
  const transport = http(env.rpcUrl);
  const pub = createPublicClient({ chain: celo, transport }) as PublicClient;
  const wallet: WalletClient = createWalletClient({ account, chain: celo, transport });
  return {
    address: account.address,
    allowance: (token, spender) =>
      pub.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [account.address, spender] }),
    async send(to, data) {
      const hash = await wallet.sendTransaction({ account, chain: celo, to, data: tagCalldata(data) });
      const rcpt = await pub.waitForTransactionReceipt({ hash, timeout: 90_000 });
      if (rcpt.status !== "success") throw new Error(`transaction reverted: ${hash}`);
      return hash;
    },
    signTyped: (t) => account.signTypedData(t as never),
  };
}

export interface SettleDeps {
  store: Store;
  chain: Chain;
  quote?: typeof requestFirmQuote;
  submit?: typeof submitSwap;
}

let running: Promise<void> = Promise.resolve();

/** Settle one ticket. Serialized per process so the settlement wallet never races its own nonce. */
export function settleTicket(ticket: TicketRec, deps: SettleDeps): Promise<TicketRec> {
  const job = running.then(() => doSettle(ticket, deps));
  running = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

async function doSettle(ticket: TicketRec, deps: SettleDeps): Promise<TicketRec> {
  const { store, chain } = deps;
  const quote = deps.quote ?? requestFirmQuote;
  const submit = deps.submit ?? submitSwap;
  const now = Date.now();

  const fresh = (await store.getTicket(ticket.id)) ?? ticket;

  // Face-value resale: the buyer paid Kovenra's wallet; pass exactly that amount to the seller, same token.
  if (fresh.resale) {
    if (fresh.settleStatus === "paid") return fresh;
    // Atomically claim this settlement (pending/failed/stale-converting -> converting) so two
    // overlapping settle attempts for the same ticket (the inline retry after a sale and the
    // 5-minute cron, which may run in different serverless instances) can't both pay out.
    const claimed = await store.claimSettlement(fresh.id, now);
    if (!claimed) return fresh;
    try {
      const token = claimed.paidToken === "CNGN" ? TOKENS.CNGN.address : TOKENS.USDT.address;
      const tx = await chain.send(
        token,
        encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [claimed.resale!.seller as Address, BigInt(claimed.paidAmount)] }),
      );
      const done: Partial<TicketRec> = { settleStatus: "paid", payoutTx: tx, resale: { ...claimed.resale!, sellerPaidTx: tx } };
      await store.updateTicket(claimed.id, done);
      return { ...claimed, ...done };
    } catch (e) {
      const msg = (e as Error).message.slice(0, 300);
      await store.updateTicket(claimed.id, { settleStatus: "failed", settleError: msg });
      return { ...claimed, settleStatus: "failed", settleError: msg };
    }
  }

  if (fresh.paidToken === "CNGN") {
    if (fresh.settleStatus === "direct") return fresh;
    await store.updateTicket(fresh.id, { settleStatus: "direct", ngnDelivered: fresh.paidAmount });
    return { ...fresh, settleStatus: "direct", ngnDelivered: fresh.paidAmount };
  }
  if (fresh.settleStatus === "paid") return fresh;

  const event = await store.getEvent(fresh.eventId);
  if (!event) throw new Error("event not found");
  if (event.payoutCheck?.sanctioned && event.payoutCheck.address.toLowerCase() === event.payoutAddress.toLowerCase()) {
    await store.updateTicket(fresh.id, { settleStatus: "failed", settleError: "Payout wallet is on the OFAC sanctions list" });
    return { ...fresh, settleStatus: "failed" };
  }

  const claimed = await store.claimSettlement(fresh.id, now);
  if (!claimed) return fresh;
  try {
    let swapTx = claimed.swapTx as Hex | undefined;
    let delivered = claimed.ngnDelivered ? BigInt(claimed.ngnDelivered) : 0n;

    if (!swapTx) {
      const q: FirmQuote = await quote(
        { sellToken: TOKENS.USDT.address, buyToken: TOKENS.CNGN.address, sellAmount: BigInt(claimed.paidAmount), taker: chain.address },
        chain.signTyped,
      );
      const allowance = await chain.allowance(TOKENS.USDT.address, q.reactor);
      if (allowance < q.takerPays) {
        await chain.send(
          TOKENS.USDT.address,
          encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [q.reactor, maxUint256] }),
        );
      }
      if (Date.now() > q.expiresAt.getTime()) throw new Error("quote expired before broadcast; will retry");
      swapTx = await chain.send(q.swap.to, q.swap.data);
      await submit(q, swapTx);
      delivered = q.buyAmount;
      await store.updateTicket(claimed.id, { swapTx, ngnDelivered: delivered.toString() });
    }

    const payoutTx = await chain.send(
      TOKENS.CNGN.address,
      encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [event.payoutAddress as Address, delivered] }),
    );
    const done: Partial<TicketRec> = { settleStatus: "paid", payoutTx, swapTx, ngnDelivered: delivered.toString() };
    await store.updateTicket(claimed.id, done);
    return { ...claimed, ...done };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    await store.updateTicket(claimed.id, { settleStatus: "failed", settleError: msg });
    return { ...claimed, settleStatus: "failed", settleError: msg };
  }
}

/** Retry anything pending, failed, or stuck in "converting" from a crashed attempt (called by the cron route and after each sale). */
export async function settlePending(deps: SettleDeps): Promise<TicketRec[]> {
  const out: TicketRec[] = [];
  for (const t of await deps.store.pendingSettlements(Date.now())) out.push(await settleTicket(t, deps));
  return out;
}
