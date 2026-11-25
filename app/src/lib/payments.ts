import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
} from "@x402/core/http";
import type { PaymentPayload, PaymentRequired, PaymentRequirements, SettleResponse } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { getAddress, type Address } from "viem";
import { NETWORK, TOKENS } from "./chain";
import { env } from "./env";

/**
 * x402 through Celo's native facilitator (api.x402.celo.org).
 * We settle BEFORE issuing a ticket: verify, settle on-chain, and only then
 * write the ticket. Nobody gets a ticket for money that didn't move.
 *
 * Two ways to pay, both offered in the same 402:
 *  - USD₮ (EIP-3009): paid to Kovenra's settlement wallet, then converted to
 *    cNGN on Textile FX and sent to the organizer.
 *  - cNGN (Permit2): paid straight to the organizer's wallet, no conversion.
 */
export interface PriceQuote {
  usdt: bigint; // USD₮ base units
  ngn: bigint; // cNGN base units
}

export interface PaymentGateway {
  requirements(p: { settler: Address; organizer: Address; price: PriceQuote }): Promise<PaymentRequirements[]>;
  paymentRequired(reqs: PaymentRequirements[], resourceUrl: string, description: string, error?: string): Promise<PaymentRequired>;
  verifyAndSettle(payload: PaymentPayload, req: PaymentRequirements): Promise<SettleResponse>;
}

export class CeloFacilitatorGateway implements PaymentGateway {
  private server: x402ResourceServer;
  private ready: Promise<void> | null = null;

  constructor() {
    const key = env.x402ApiKey;
    const facilitator = new HTTPFacilitatorClient({
      url: env.facilitatorUrl,
      createAuthHeaders: async () => {
        const h: Record<string, string> = key ? { "X-API-Key": key } : {};
        return { verify: h, settle: h, supported: h };
      },
    });
    this.server = new x402ResourceServer(facilitator);
    this.server.register("eip155:*", new ExactEvmScheme());
  }

  private init() {
    if (!this.ready) this.ready = this.server.initialize().catch((e) => {
      this.ready = null;
      throw e;
    });
    return this.ready;
  }

  async requirements(p: { settler: Address; organizer: Address; price: PriceQuote }) {
    await this.init();
    const usdt = await this.server.buildPaymentRequirements({
      scheme: "exact",
      network: NETWORK,
      payTo: getAddress(p.settler),
      maxTimeoutSeconds: 120,
      price: {
        amount: p.price.usdt.toString(),
        asset: TOKENS.USDT.address,
        extra: { name: TOKENS.USDT.eip712Name, version: TOKENS.USDT.eip712Version },
      },
    });
    const cngn = await this.server.buildPaymentRequirements({
      scheme: "exact",
      network: NETWORK,
      payTo: getAddress(p.organizer),
      maxTimeoutSeconds: 120,
      price: {
        amount: p.price.ngn.toString(),
        asset: TOKENS.CNGN.address,
        extra: { name: TOKENS.CNGN.eip712Name, version: TOKENS.CNGN.eip712Version, assetTransferMethod: "permit2" },
      },
    });
    return [...usdt, ...cngn];
  }

  async paymentRequired(reqs: PaymentRequirements[], url: string, description: string, error?: string) {
    await this.init();
    return this.server.createPaymentRequiredResponse(reqs, { url, description, mimeType: "application/json" }, error);
  }

  async verifyAndSettle(payload: PaymentPayload, req: PaymentRequirements) {
    await this.init();
    const v = await this.server.verifyPayment(payload, req);
    if (!v.isValid) {
      return { success: false, errorReason: v.invalidReason ?? "invalid_payment", errorMessage: v.invalidMessage, transaction: "", network: NETWORK } as SettleResponse;
    }
    return this.server.settlePayment(payload, req);
  }
}

/** Read the payment header (v2 PAYMENT-SIGNATURE, or legacy X-PAYMENT). */
export function readPaymentHeader(get: (name: string) => string | undefined | null): PaymentPayload | null {
  const raw = get("payment-signature") ?? get("x-payment");
  if (!raw) return null;
  try {
    return decodePaymentSignatureHeader(raw);
  } catch {
    return null;
  }
}

/** Pick the offered requirement the buyer actually paid against. */
export function matchRequirement(payload: PaymentPayload, offered: PaymentRequirements[]): PaymentRequirements | null {
  const a = payload.accepted;
  if (!a) return null;
  return (
    offered.find(
      (r) =>
        r.scheme === a.scheme &&
        r.network === a.network &&
        r.asset.toLowerCase() === String(a.asset).toLowerCase() &&
        r.payTo.toLowerCase() === String(a.payTo).toLowerCase() &&
        BigInt(r.amount) === BigInt(a.amount),
    ) ?? null
  );
}

export const encodeRequired = encodePaymentRequiredHeader;
export const encodeResponse = encodePaymentResponseHeader;

let gateway: PaymentGateway | null = null;
export function getGateway(): PaymentGateway {
  if (!gateway) gateway = new CeloFacilitatorGateway();
  return gateway;
}
export function setGatewayForTests(g: PaymentGateway) {
  gateway = g;
}
