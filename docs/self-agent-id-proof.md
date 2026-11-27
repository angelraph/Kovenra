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
