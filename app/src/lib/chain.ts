import { getAddress, type Address } from "viem";

/** Celo mainnet. Kovenra only runs on mainnet; tests use mocks, never Sepolia money. */
export const CHAIN_ID = 42220;
export const NETWORK = "eip155:42220" as const;
export const CELOSCAN = "https://celoscan.io";

export type TokenSymbol = "USDT" | "CNGN";

export interface Token {
  symbol: TokenSymbol;
  address: Address;
  decimals: number;
  /** EIP-712 domain name the x402 facilitator expects (from x402.celo.org). */
  eip712Name: string;
  eip712Version: string;
  transfer: "eip3009" | "permit2";
}

export const TOKENS: Record<TokenSymbol, Token> = {
  USDT: {
    symbol: "USDT",
    address: getAddress("0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"),
    decimals: 6,
    eip712Name: "Tether USD",
    eip712Version: "1",
    transfer: "eip3009",
  },
  CNGN: {
    symbol: "CNGN",
    address: getAddress("0xF6829D7393dAe24509eb1E52eE8e572e2E271a4f"),
    decimals: 6,
    eip712Name: "cNGN",
    eip712Version: "1",
    transfer: "permit2",
  },
};

/** Canonical Permit2, used by cNGN x402 payments and by Textile quotes. */
export const PERMIT2 = getAddress("0x000000000022D473030F116dDEE9F6B43aC78BA3");

/** Self Agent ID registry on Celo mainnet. */
export const SELF_REGISTRY = getAddress("0xaC3DF9ABf80d0F5c020C06B04Cced27763355944");

export const txUrl = (hash: string) => `${CELOSCAN}/tx/${hash}`;
export const addressUrl = (a: string) => `${CELOSCAN}/address/${a}`;

/** Convert a decimal string like "12.5" to base units without floating point. */
export function toUnits(amount: string, decimals: number): bigint {
  const [whole, frac = ""] = amount.trim().split(".");
  if (!/^\d+$/.test(whole || "0") || !/^\d*$/.test(frac)) throw new Error(`bad amount: ${amount}`);
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

export function fromUnits(units: bigint, decimals: number, maxFrac = 2): string {
  const neg = units < 0n;
  const v = neg ? -units : units;
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").slice(0, maxFrac).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole.toString()}${frac ? "." + frac : ""}`;
}

export function formatNaira(units: bigint): string {
  const n = Number(units / 10n ** 4n) / 100; // cNGN has 6 decimals
  return "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}
