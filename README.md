# Kovenra

Fair tickets for real people, paid in naira, on Celo.

Kovenra (from "covenant", a promise) is a ticket counter that only sells to real, unique people. One person, one fair seat.

## The problem

You know how it goes. A big show is announced in Abuja, Port Harcourt or Lagos, the link goes live, and a few minutes later it's sold out. By that evening the same tickets are on WhatsApp and X for two or three times the price.

The fans who waited all morning lose out. The organizer gets the blame. The only people who win are the ones running bots and fake accounts.

It happens because most ticket sites count accounts, not people. Anyone with a hundred accounts gets a hundred tries.

## What Kovenra does about it

- **One ticket per real person.** Every buyer proves, once, that they're a real and unique person, using the free Self app and their passport. Kovenra never sees their name or passport. It only gets a yes or a no.
- **Naira for the organizer, in seconds.** Fans pay in dollars (USD₮) or naira (cNGN) from their phone. Dollar payments are converted to naira on Textile FX straight away and sent to the organizer's own wallet.
- **A QR code that works once.** The organizer's phone is the scanner at the door. Copied or used tickets are caught on the spot.
- **AI agents welcome, bots not.** An agent can buy for its person if it carries a Self Agent ID. All of one person's agents share that person's limit, so nobody can run a hundred bots to clear a show.

It works anywhere in Nigeria. The price is set in naira, and fans abroad can pay in dollars.

## How a sale works

1. **The organizer lists the event.** Naira price, number of seats, tickets per person, and an optional 18+ check. No account and no fee.
2. **The fan verifies once with Self.** Their phone keeps a Self Agent ID key from then on.
3. **The fan, or their agent, asks to buy.** Kovenra checks the Self signature against the registry on Celo mainnet. No verified person behind it means a 403, before any money moves.
4. **A seat is held for that person.** If one person's second agent tries, it hits the same limit and gets a 429.
5. **They pay over x402.** The fan gets a choice: USD₮ (gasless) or cNGN (paid straight to the organizer). Kovenra settles the payment through Celo's facilitator before it writes the ticket.
6. **Naira lands with the organizer.** USD₮ goes to Kovenra's settlement wallet for a few seconds, gets converted to cNGN with a Textile FX quote, and is sent on. The approve, swap and payout all carry our ERC-8021 attribution tag.
7. **QR at the door.** A signed code that checks in once.

## The website

The site has a landing page with live data: the current naira rate from Textile, the latest Celo block, and Kovenra's own totals. Every number is real.

It also has its own pages for:
- events and listing an event
- how it works, organizers, fans and AI agents
- pricing, FAQ, about, trust & safety, live proof and brand
- contact, terms and privacy

It's built for phones first.

The design notes, including what we learned from studying Figma, Mobbin and Framer, are in [docs/DESIGN.md](docs/DESIGN.md).

## Where things are in the code

| What | File |
| --- | --- |
| Self Agent ID check (being verified changes what the service does) | `app/src/lib/selfgate.ts`, `app/src/lib/purchase.ts` |
| One-person limits shared across agents | `app/src/lib/store.ts` (`hold`) |
| x402 payments through Celo's facilitator | `app/src/lib/payments.ts` |
| Textile FX conversion and payout | `app/src/lib/textile.ts`, `app/src/lib/settle.ts` |
| ERC-8021 tags | `app/src/lib/attribution.ts` |
| Live numbers for the landing page | `app/src/lib/stats.ts` |
| Agent skill file | `app/public/skill.md` |
| Tests | `app/src/lib/kovenra.test.ts` |

## Run it yourself

```
cd app
npm install
cp .env.example .env.local   # fill in your own values
npm test
npm run dev
```

Without a database it keeps data in a local file, which is fine for trying it out.

## Cashing out

cNGN is the official naira stablecoin on Celo. Organizers can hold it, spend it, or cash it out to any Nigerian bank through the cNGN app, Busha or Quidax.

## Honest notes

- Kovenra holds USD₮ for a few seconds, between the payment and the conversion. cNGN payments never touch Kovenra.
- The Self app needs a passport with an NFC chip. Nigerian, UK and US passports all have one.
- Photos on the site are free Unsplash photos.
