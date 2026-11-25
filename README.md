# Kovenra

Fair tickets for real people, paid in naira, on Celo.

Popular shows across Nigeria sell out weeks early, and many tickets end up resold on
WhatsApp and X at three times the price. Kovenra gives every organizer a ticket counter that only sells to
real, unique people. Fans pay in dollars (USD₮) or naira (cNGN) from their phone, and the
organizer receives naira in their own wallet seconds later.

## How it works

1. **The organizer lists an event.** They set a naira price, the number of seats, how many
   tickets each person can buy, and optionally an 18+ check. No account and no fee to list.
2. **The fan verifies once with Self.** They scan their passport in the Self app. Kovenra
   never sees their name or passport, only a yes or no. Their phone keeps a Self Agent ID key.
3. **The fan (or their AI agent) buys.** The ticket counter checks the Self Agent ID
   signature against the registry on Celo mainnet. Bots and unverified agents get a 403
   before any payment. Seats are counted per human, so one person's ten agents still share
   one limit (429).
4. **Payment over x402.** The 402 offers USD₮ (gasless, EIP-3009) or cNGN (Permit2, paid
   straight to the organizer). Kovenra settles through Celo's facilitator *before* it
   writes the ticket.
5. **Naira for the organizer.** USD₮ goes to Kovenra's settlement wallet, which converts
   exactly that amount to cNGN with a Textile FX RFQ and pays the organizer. Approve, swap
   and payout all carry the ERC-8021 attribution tag.
6. **QR at the door.** The ticket is a signed QR code that checks in once. The organizer's
   phone is the scanner.

## Where things are

| What | File |
| --- | --- |
| Self Agent ID gate (identity changes what the service does) | `app/src/lib/selfgate.ts` and `app/src/lib/purchase.ts` |
| Per-human limits shared across agents | `app/src/lib/store.ts` (`hold`) |
| x402 through Celo's facilitator | `app/src/lib/payments.ts` |
| Textile FX conversion and payout | `app/src/lib/textile.ts`, `app/src/lib/settle.ts` |
| ERC-8021 tags | `app/src/lib/attribution.ts` |
| Agent skill file | `app/public/skill.md` |
| Tests | `app/src/lib/kovenra.test.ts` |

## Run it

```
cd app
npm install
cp .env.example .env.local   # fill in your own values
npm test
npm run dev
```

## Cashing out

cNGN on Celo is the official naira stablecoin from WrappedCBDC. Organizers can hold it,
spend it, or redeem it to a Nigerian bank through cNGN's own app or partners like Busha and
Quidax.

## Honest notes

- Kovenra holds USD₮ briefly, between the payment and the conversion (seconds). cNGN
  payments never touch Kovenra.
- The Self app needs an NFC passport. Nigerian, UK and US passports are in Self's registry.
