# Kovenra as an agent

Kovenra is both a service that agents buy from and an agent itself.

## Kovenra's identity

| | |
|---|---|
| ERC-8004 | **#10137** in the Celo Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, registered from Kovenra's own wallet ([tx](https://celoscan.io/tx/0x09cd538ed3a2974b373dff71d83797195f31c4fb4a0bf57d24828227eb96c9c0)) |
| Registration document | https://kovenra.xyz/.well-known/agent-registration.json (also served at `/agent.json` and `/.well-known/agent-card.json`) |
| Self Agent ID | **#223**, `0xBecc56A1dd6146feE6113695A94538AD323C0656`, verified with a passport ([info](https://agent-api.self.xyz/api/agent/info/42220/223)) |
| Wallet | `0x617B299FF63AB479283c895d2F3DF95efEf184Fb`: x402 PayTo, ERC-8004 owner, and the signer of every tagged Textile swap and cNGN payout |
| Skill file | https://kovenra.xyz/skill.md |

## What an agent can do

1. **Find events:** `GET https://kovenra.xyz/api/events` and `GET /api/events/{slug}` return the naira price, today's USD₮ price, seats left, the per-person limit, the age rule and whether verified humans are required.
2. **Buy a ticket for its human:** `POST /api/events/{slug}/buy`, signed with the agent's Self Agent ID (`x-self-agent-*` headers). The first call returns HTTP 402 with x402 payment requirements (USD₮ to Kovenra, or cNGN straight to the organizer). Retry with the payment header; Kovenra settles through Celo's facilitator and returns the ticket.
3. **Get the ticket:** the response includes the ticket URL and a signed QR code that checks in once at the door.

## The rules agents meet

| Situation | Response |
|---|---|
| No Self Agent ID on a verified-humans event | 403 `unsigned` |
| A key no human registered | 403 `not_verified` |
| Under the event's age limit | 403 `too_young` |
| The human already holds their limit (from any of their agents) | 429 `per_person_limit` |
| Sold out | 409, unless a ticket was handed back for face-value resale |

## What Kovenra's agent does on its own

After each sale it requests a Textile FX quote for exactly the USD₮ received, sends the tagged swap, and sends the cNGN to the organizer. A Vercel cron job (`/api/settle/run`, every 5 minutes) retries any payout that failed and runs Fair Drop draws when entries close.

## Try it

```
cd app
npm run agent:register -- --name demo-1     # one passport scan in the Self app
npm run demo:buyers -- --event <slug>       # 403 / 403 / 402 / 429
```

## For an automated reviewer

`GET https://kovenra.xyz/`, `/agent.json` (and the three `.well-known` aliases above), `/skill.md`, `/api/events` and `/api/events/{slug}` are public, unauthenticated, and return 200 for any caller, bot included — no headers, cookies or sign-in needed. If one of those ever answers with anything other than 200, it's a real problem; please open an issue.

`POST /api/events/{slug}/buy` is different on purpose: it returns 403 to a caller with no Self Agent ID on a verified-humans event, and 403 again if that ID isn't itself verified. That refusal is the Self Agent ID check this project is built around (see [the rules agents meet](#the-rules-agents-meet) above), not a broken endpoint — a request that skips `x-self-agent-*` headers is expected to be turned away.
