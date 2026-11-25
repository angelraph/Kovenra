import { codeFromRepo, fromDataSuffix, toDataSuffix } from "@celo/attribution-tags";
import { concat, type Hex } from "viem";
import { env } from "./env";

/**
 * ERC-8021 attribution. Every Kovenra transaction carries the hackathon code
 * (plus our own "kovenra" code for analytics). A transaction sent without the
 * tag can never be credited later, so every server-side send goes through
 * `tagCalldata` and the client is built with the suffix.
 */
export function attributionCodes(): string[] {
  const codes = [env.attributionCode];
  if (!codes.includes("kovenra")) codes.push("kovenra");
  return codes;
}

export function assertCodeMatchesRepo(): void {
  if (!env.repoSlug || env.attributionCode === "celo_test1234") return;
  if (codeFromRepo(env.repoSlug) !== env.attributionCode) {
    throw new Error("ATTRIBUTION_CODE does not match REPO_SLUG; transactions would credit nobody");
  }
}

export function attributionSuffix(): Hex {
  return toDataSuffix(attributionCodes()) as Hex;
}

/** Append the tag to calldata. The EVM ignores trailing bytes, so execution is unchanged. */
export function tagCalldata(data: Hex | undefined): Hex {
  const suffix = attributionSuffix();
  return data && data !== "0x" ? concat([data, suffix]) : suffix;
}

/** Decode the tag from calldata (used by tests and the proof page). */
export function readTag(data: Hex): string[] | null {
  const parsed = fromDataSuffix(data);
  return parsed ? [...parsed.codes] : null;
}
