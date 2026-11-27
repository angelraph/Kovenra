# Self Agent ID proof on Celo mainnet

Run on 2026-11-27 03:50 UTC against the live counter for **Eleven Stars VIP Summit**
(a verified-humans event, 1 ticket per person):
https://kovenra.xyz/api/events/eleven-stars-vip-summit-7d4add/buy

Script: `app/scripts/demo-buyers.ts` (`npm run demo:buyers -- --event eleven-stars-vip-summit-7d4add`)

| # | Buyer | Expected | Got | Why |
|---|---|---|---|---|
| 1 | Plain bot, no Self Agent ID | 403 | **403** `unsigned` | turned away before any price is offered |
| 2 | Bot with a key no human registered | 403 | **403** `not_verified` | signature checked against the Self registry on Celo, no human proof |
| 3 | Verified agent #224 | 402 | **402** price quote 3.49 USD₮ | identity passed, x402 payment offered |
| 4 | Same human's second agent #223 | 429 | **429** `per_person_limit` | agents #223 and #224 share one passport, so they share one ticket |

All three refusals are logged and appear on the event's public fairness report
(https://kovenra.xyz/e/eleven-stars-vip-summit-7d4add/fair), under "Bots turned away".

## A real verified purchase

On 2026-11-27 a member of Eleven Stars VIPs (not on the Kovenra team) verified with their own passport in the Self app (Self Agent ID **#226**), and bought a ticket from MiniPay:

| Step | Transaction |
|---|---|
| x402 payment (3.49 USD₮, through Celo's facilitator to our PayTo) | [0x4626…0c57](https://celoscan.io/tx/0x4626477ac681dfb6ad64f73d6fdb767b32b2a250040bc0c5cd4092f2941d0c57) |
| Tagged Textile FX conversion USD₮ → cNGN | [0x3ca7…3d32](https://celoscan.io/tx/0x3ca79e631ef966350753c8b15c563a181c912a9fc4bbdcf6036497a4375d3d32) |
| Tagged cNGN payout to the organizer (₦5,030.55) | [0xf8b6…8776](https://celoscan.io/tx/0xf8b6b776236ff5db9c2837f8d78fdf839024b6fd0a71d4c9f683296f96ec8776) |

The event's fairness report counts it as 1 ticket to 1 verified person: https://kovenra.xyz/e/eleven-stars-vip-summit-7d4add/fair

## Self at the door too

Eleven Stars VIP Summit has the VIP door check switched on. At the gate the organizer scans the ticket QR; the scanner then shows a fresh Self code. The guest scans it with their own Self app, which creates a one-time agent backed by their passport. Kovenra checks that agent's nullifier against the nullifier saved on the ticket at purchase:

- same passport: checked in;
- a different passport (someone holding the owner's phone or a copied QR): "Wrong person, do not let them in";
- no valid proof: refused, ticket left unused.

Kovenra never learns a name. Code: `app/src/lib/door.ts`; routes `/api/events/:slug/checkin` and `/api/events/:slug/door-confirm` in `app/src/lib/api.ts`. Tests in `app/src/lib/kovenra.test.ts` ("VIP door check").

## The agents
- Kovenra's own Self Agent ID: #223, 0xBecc56A1dd6146feE6113695A94538AD323C0656
  (https://agent-api.self.xyz/api/agent/info/42220/223)
- Demo agent: #224, 0x753f93C3f2a6FABb76DD20F648af01CafBBa4A55
  (https://agent-api.self.xyz/api/agent/info/42220/224)
- Both verified with the same passport, which is exactly what makes buyer 4 get 429.

## Where the check lives in the code
- `app/src/lib/purchase.ts` line 90: on a verified-humans event, the request must carry a valid Self Agent ID signature, or it gets 403 before any payment.
- `app/src/lib/selfgate.ts` line 42: SelfAgentVerifier checks the signature against the registry on Celo mainnet and returns the human's nullifier and age.
- `app/src/lib/store.ts` (`hold`): seats are counted per human (Self nullifier), so every agent of one person shares that person's limit.

## Real x402 payments
Kovenra's x402 sales settle through Celo's facilitator to the PayTo 0x617B299FF63AB479283c895d2F3DF95efEf184Fb.
Example: 0xa26f718142a0c1f9a5134cc5556365e4d2034a485c0fe47a6a5367826b55c50f. Every sale is listed at https://kovenra.xyz/proof.
