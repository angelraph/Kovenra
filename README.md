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

- **Fair Drop for hot shows.** Instead of a race the fastest bot wins, verified people enter a
  draw, one entry each. When entries close, the hash of the next Celo block picks the winners.
  Nobody can know it in advance, and anyone can recompute the result.
- **Resale only at face value.** Can't go? Hand the ticket back. The next verified fan buys it at
  the original price, the old QR stops working, and the seller is paid automatically. A ticket
  can never sell for more than face value, so touts have nothing to gain.
- **A public fairness report for every event.** Real people served, bots turned away, the most
  tickets any one person got, every resale, the draw proof and every transaction, on one page.

It works anywhere in Nigeria. The price is set in naira, and fans abroad can pay in dollars.

Kovenra is ERC-8004 agent **#10137** on Celo mainnet
([registration tx](https://celoscan.io/tx/0x09cd538ed3a2974b373dff71d83797195f31c4fb4a0bf57d24828227eb96c9c0)),
registered from its own wallet, which is also its x402 PayTo address and the wallet that sends every tagged transaction.

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
| Fair Drop: entries, verifiable draw, claim window | `app/src/lib/drop.ts` |
| Face-value resale (listing, checkout, seller payout) | `app/src/lib/purchase.ts`, `app/src/lib/store.ts`, `app/src/lib/settle.ts` |
| Fairness report | `app/src/lib/report.ts`, `app/src/app/e/[slug]/fair/` |
| ERC-8004 registration from Kovenra's wallet | `app/src/lib/erc8004.ts`, `app/src/app/owner/` |
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

## Kovenra's own identity

Kovenra is an agent too. It has an ERC-8004 identity in the Self Agent ID registry on Celo
(`0xaC3DF9ABf80d0F5c020C06B04Cced27763355944`), backed by a real person's passport scan.
Its registration document lives at `/.well-known/agent-registration.json` and is also
written on-chain to its registry entry.

```
npm run agent:register     # scan your passport in the Self app once; saves the key to app/.agent/
npm run agent:card         # writes the ERC-8004 document on-chain (asks before sending)
```

## See the rules work

The demo buyers script runs four buyers against the real ticket counter:

1. A plain bot gets 403.
2. A bot with a made-up key gets 403.
3. A verified person's agent gets a price, or a real ticket with `--pay`.
4. The same person's second agent gets 429.

```
npm run agent:register -- --name demo-1
npm run agent:register -- --name demo-2      # same passport
npm run demo:buyers -- --event <slug>        # add --pay to buy one real ticket
```

Every refusal shows up on the live board and in the organizer's dashboard.

## Payout retries

If a naira conversion ever fails, a Vercel cron job (`app/vercel.json`) retries it every
five minutes until it lands. It uses `CRON_SECRET`.

## Cashing out

cNGN is the official naira stablecoin on Celo. Organizers can hold it, spend it, or cash it out to any Nigerian bank through the cNGN app, Busha or Quidax.

## Honest notes

- Kovenra holds USD₮ for a few seconds, between the payment and the conversion. cNGN payments never touch Kovenra.
- The Self app needs a passport with an NFC chip. Nigerian, UK and US passports all have one.
- Photos on the site are free Unsplash photos.
