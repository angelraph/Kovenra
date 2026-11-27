# Kovenra: hackathon submission

Celo **Agents Open for Business** hackathon (Loops House). Deadline: **Mon 7 Dec 2026, 09:00 GMT**.
Tracks: **Stablecoin Corridors (Textile FX)** and **Self Agent ID: Verified Agent Payments**.

## Submission fields

| Field | Value |
|---|---|
| Project name | Kovenra |
| One-liner | Fair event tickets for real people across Nigeria. Fans pay in dollars over x402, the money is converted to naira on Textile FX, and the organizer gets cNGN in seconds. One fair seat per person, no bots, no touts. |
| Live app | https://kovenra.xyz |
| Demo video | https://youtu.be/4DXQQ04w0ao (2:55) |
| Repository | https://github.com/angelraph/Kovenra (public) |
| Public X post | https://x.com/RaphElevator/status/2126167520813990031 |
| Agent wallet | [`0x617B299FF63AB479283c895d2F3DF95efEf184Fb`](https://celoscan.io/address/0x617B299FF63AB479283c895d2F3DF95efEf184Fb) |
| x402 PayTo | same wallet, `0x617B299FF63AB479283c895d2F3DF95efEf184Fb` |
| ERC-8004 agent ID | **#10137**, [registration tx](https://celoscan.io/tx/0x09cd538ed3a2974b373dff71d83797195f31c4fb4a0bf57d24828227eb96c9c0), document at https://kovenra.xyz/.well-known/agent-registration.json |
| Self Agent ID | **#223** ([info](https://agent-api.self.xyz/api/agent/info/42220/223)); demo agent #224 ([info](https://agent-api.self.xyz/api/agent/info/42220/224)) |
| Attribution tag | `celo_09b3ddb9ca23` |
| Region | Nigeria (Enugu) |
| Contact | Uzoechi Raphael, founder. X [@RaphElevator](https://x.com/RaphElevator), Telegram @raphdapope |

## Named users

| Organizer | Job Kovenra does for them | Result so far |
|---|---|---|
| **Elysian Home** (Enugu) | Sells tickets for Elysian Home Laughter Night (Coal City Garden, 15 Dec, ₦1,500, 20 seats), converts every payment to naira on Textile FX and pays their wallet `0x1988…b98a`; their phone is the door scanner | 12 tickets to 12 different buyers, ₦18,102 in cNGN paid out. Buyers came from Elysian Home's own WhatsApp groups |
| **Eleven Stars VIPs** (Abuja) | Sells Eleven Stars VIP Summit (Royalton Hotel, 20 Dec, ₦5,000, 10 seats) to verified humans only, one ticket each, naira to `0x19b8…dc68` | First ticket bought by a passport-verified member (Self #226): [x402 payment](https://celoscan.io/tx/0x4626477ac681dfb6ad64f73d6fdb767b32b2a250040bc0c5cd4092f2941d0c57), [conversion](https://celoscan.io/tx/0x3ca79e631ef966350753c8b15c563a181c912a9fc4bbdcf6036497a4375d3d32), [payout ₦5,030.55](https://celoscan.io/tx/0xf8b6b776236ff5db9c2837f8d78fdf839024b6fd0a71d4c9f683296f96ec8776) |

Every sale, conversion and payout: https://kovenra.xyz/proof. Per-event reports: [Elysian](https://kovenra.xyz/e/elysian-home-laughter-night-f3ddd2/fair), [Eleven Stars](https://kovenra.xyz/e/eleven-stars-vip-summit-7d4add/fair).

## Stablecoin Corridors: requirements

| Requirement | How Kovenra meets it |
|---|---|
| Tagged Textile FX conversion on mainnet, in the product flow | Every ticket sale converts exactly the USD₮ received to cNGN through Textile RFQ v2; our tag is appended to `transactions.swap.data`. Examples: [0xf898…be13](https://celoscan.io/tx/0xf89803e41a0111b3f33cee1c74d503c92ab284c124ec1625e259e22bf8bbbe13), [0x815e…bdd8](https://celoscan.io/tx/0x815e848243c2e88525fdc3a8f98921a2c3a4c2ff4a0e9ce6bececb48e84ddbd8), [0x5f46…419a](https://celoscan.io/tx/0x5f4608f0941301d71d56049e517321cd8f1022f86290c56324a07ad0e166419a). All 12 are listed in the [README](README.md#live-on-celo-mainnet) |
| Local stablecoin reaches a recipient outside the team | cNGN goes to the organizer's own wallet (Elysian Home `0x1988…b98a`), e.g. [0x85a0…b312](https://celoscan.io/tx/0x85a060891d478b86a951eb260e19282ab54353777e66881c3b2a81d4c2a4b312) |
| ERC-8004 identity | #10137 |
| No arbitrage, self-trading or maker role | Kovenra only takes quotes as a taker for real ticket payments |

Code: `app/src/lib/settle.ts`, `app/src/lib/textile.ts`, `app/src/lib/attribution.ts`.

## Self Agent ID: requirements

| Requirement | How Kovenra meets it |
|---|---|
| Self Agent ID decides who gets served, paid or limited | Verified-humans events: unsigned → 403, unverified → 403, verified → 402 quote, same human's second agent → 429. Live run in [docs/self-agent-id-proof.md](docs/self-agent-id-proof.md) |
| Self also guards the door | VIP door check (live on Eleven Stars): after the ticket QR, the guest scans a fresh Self code with their own passport; entry only if the new nullifier matches the buyer's. A stolen phone or copied QR fails, and no name is shared. [`app/src/lib/door.ts`](app/src/lib/door.ts) |
| Payments through x402 | A verified member (#226) paid over x402: [0x4626…0c57](https://celoscan.io/tx/0x4626477ac681dfb6ad64f73d6fdb767b32b2a250040bc0c5cd4092f2941d0c57). Celo's facilitator settles every sale to our PayTo, e.g. [0xa26f…c50f](https://celoscan.io/tx/0xa26f718142a0c1f9a5134cc5556365e4d2034a485c0fe47a6a5367826b55c50f) |
| File and line of the check | [`app/src/lib/purchase.ts#L90`](app/src/lib/purchase.ts#L90), [`app/src/lib/selfgate.ts#L42`](app/src/lib/selfgate.ts#L42), [`app/src/lib/store.ts`](app/src/lib/store.ts) (`hold`) |
| Public X post tagging @selfxyz and @Celo | https://x.com/RaphElevator/status/2126167520813990031 |

## Checklist

- [x] Celo mainnet only
- [x] ERC-8004 registered from the agent wallet (#10137)
- [x] Self Agent ID registered (#223)
- [x] Public GitHub repo
- [x] Attribution tag on every transaction we send; PayTo registered for x402
- [x] Code written during the hackathon (from 20 Nov)
- [x] Following @Celo and @CeloDevs
