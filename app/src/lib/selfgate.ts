import { SelfAgentVerifier } from "@selfxyz/agent-sdk";
import { env } from "./env";

/**
 * The Self Agent ID gate. Before Kovenra sells a ticket it checks the signed
 * request against the Self registry on Celo mainnet:
 *  - is there a real, unique human behind this agent (passport proof, fresh)?
 *  - is that human old enough for this event (ZK-attested olderThan)?
 * It returns the human's nullifier, which is the same for every agent that one
 * person registers. Kovenra counts tickets by nullifier, so one person's agents
 * share one limit.
 */
export interface GateInput {
  signature?: string;
  timestamp?: string;
  method: string;
  url: string;
  rawBody: string;
}

export type GateResult =
  | { ok: true; agentId: string; agentAddress: string; nullifier: string; olderThan: number }
  | { ok: false; reason: "unsigned" | "not_verified" | "too_young" | "error"; detail: string; agentAddress?: string };

export interface HumanVerifier {
  check(input: GateInput, minAge: number): Promise<GateResult>;
}

export class SelfHumanVerifier implements HumanVerifier {
  private verifier: SelfAgentVerifier;

  constructor() {
    this.verifier = new SelfAgentVerifier({
      network: "mainnet",
      // Up to 10 agents per person may buy; they all count against one limit.
      maxAgentsPerHuman: env.selfMaxAgentsPerHuman,
      includeCredentials: true,
      requireSelfProvider: true,
      // A fan who just verified in Self must be served within seconds, not after a 60s cached "no".
      cacheTtlMs: 3_000,
    });
  }

  async check(input: GateInput, minAge: number): Promise<GateResult> {
    if (!input.signature || !input.timestamp) {
      return { ok: false, reason: "unsigned", detail: "No Self Agent ID signature on this request" };
    }
    try {
      // Verify the exact raw bytes we received, never a re-serialised body.
      const r = await this.verifier.verify({
        signature: input.signature,
        timestamp: input.timestamp,
        method: input.method,
        url: input.url,
        body: input.rawBody,
      });
      if (!r.valid) {
        return { ok: false, reason: "not_verified", detail: r.error ?? "Agent has no valid human proof", agentAddress: r.agentAddress };
      }
      const olderThan = Number(r.credentials?.olderThan ?? 0n);
      if (minAge > 0 && olderThan < minAge) {
        return { ok: false, reason: "too_young", detail: `This event is ${minAge}+`, agentAddress: r.agentAddress };
      }
      return {
        ok: true,
        agentId: r.agentId.toString(),
        agentAddress: r.agentAddress,
        nullifier: r.nullifier.toString(),
        olderThan,
      };
    } catch (e) {
      return { ok: false, reason: "error", detail: (e as Error).message };
    }
  }
}

let verifier: HumanVerifier | null = null;
export function getVerifier(): HumanVerifier {
  if (!verifier) verifier = new SelfHumanVerifier();
  return verifier;
}
export function setVerifierForTests(v: HumanVerifier) {
  verifier = v;
}
