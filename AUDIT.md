# Internal review

What we checked before submitting, what we fixed, and what is still a known limit. Last updated 2026-11-27.

## Checked

| Area | How | Result |
|---|---|---|
| Every sale settled | Read every ticket's conversion and payout on Celo | 12 of 12 sales have a tagged Textile swap and a tagged cNGN payout to the organizer |
| Attribution tags | Decoded the calldata of every conversion and payout | All carry `celo_09b3ddb9ca23` and `kovenra` |
| Independent buyers | Read the payer of every x402 payment | 12 different wallets, none belongs to the team |
| Self gate on mainnet | Ran the demo buyers against the live counter | 403 / 403 / 402 / 429 as designed |
| Organizer dashboard | Called the admin API with and without the key | Opens with the right key, 403 with a wrong one |
| Door scanner | Sent a forged ticket code | Rejected: "Not a Kovenra ticket" |
| VIP door check | Called door-confirm on the live Eleven Stars event without a Self proof, and without the organizer key | "Self could not confirm the passport" (ticket untouched); 403 without the key. Unit tests: same passport gets in once, a different passport is turned away |
| Paid checks on buy | Ran the payout wallet screening for both live events from the agent wallet | Two 0.002 USDC payments settled on Celo from 0x617B…184Fb; both wallets clear; listed on /proof |
| Every page and API | Requested all 30+ pages and the public API endpoints | All return 200; unknown pages 404 |
| Settlement wallet | Read its balances | Enough CELO for gas; no USD₮ left sitting in it |
| Build and tests | `next build`, `tsc`, lint, 35 unit tests | All pass |

## Fixed during the hackathon

- The fairness report showed "0 verified people" on open events; it now counts paying wallets and says so.
- Two deploys failed on an unescaped apostrophe; the build is now run before every push.
- Fans in MiniPay were sent to the Play Store when verifying; the page now gives a copy-to-Chrome step, and outside MiniPay it opens Self with its native app link.
- The Self verify step used to give up after 15 minutes with a raw SDK message; it now waits up to 30 minutes and speaks plainly.
- Raw wallet and network errors are translated before fans see them.
- The naira rate fetch could take 4 to 5 seconds on a cold start; it is now cached across instances with a recent-rate fallback.
- The proof page said every transaction carried our tag; it now says exactly which ones do (x402 payments are sent by Celo's facilitator).

## Known limits

- USD₮ sits in Kovenra's wallet for a few seconds between payment and conversion.
- Prices below Textile's ~$1 minimum are charged as $1.
- Kovenra isn't listed in MiniPay's Discover yet (MiniPay's form failed on their side); MiniPay users use "Load test page".
- Open events (verified humans off) can't stop one person from buying with several wallets; organizers who need that switch verified humans on.
- The Self app needs a passport with an NFC chip; the NIN didn't work in our tests.
