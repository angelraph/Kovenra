export type Faq = { q: string; a: string[]; cat: FaqCat; top?: boolean };
export type FaqCat = "Fans" | "Organizers" | "Money" | "Privacy" | "Agents";
export const FAQ_CATS: FaqCat[] = ["Fans", "Organizers", "Money", "Privacy", "Agents"];

export const FAQS: Faq[] = [
  // Fans
  { cat: "Fans", top: true, q: "Why do I have to verify before buying?", a: [
    "It's how we keep tickets away from bots and touts. You scan your passport once in the free Self app, and from then on Kovenra knows you're a real, unique person.",
    "That's what lets us sell one ticket per person, so the show doesn't sell out to resellers in two minutes.",
  ] },
  { cat: "Fans", top: true, q: "What is a fair drop?", a: [
    "For shows that would sell out in seconds, the organizer can run a fair drop instead of a race. Verified people enter during a window, one entry each, however many agents or devices they use.",
    "When entries close, the hash of the next Celo block picks the winners. Nobody, including Kovenra, can know that hash in advance, and anyone can check the result on the event's fairness report. Winners get time to pay, then leftover seats open to everyone who entered.",
  ] },
  { cat: "Fans", top: true, q: "I can't go anymore. Can I sell my ticket?", a: [
    "Yes, at face value. Open your ticket and tap Hand it back. When the show is sold out, the next verified fan buys it at the original price, your old QR stops working, and the money goes to your wallet automatically.",
    "Nobody can sell a Kovenra ticket for more than face value, so there's nothing for touts to make.",
  ] },
  { cat: "Fans", q: "Which passports work?", a: [
    "Any passport with an NFC chip (the small chip symbol on the cover). Nigerian, UK, US and most other modern passports have one. Self reads the chip with your phone.",
    "No passport? A verified friend can buy for you, up to the organizer's limit per person. There's a step-by-step guide at /verify.",
  ] },
  { cat: "Fans", q: "Do I need a crypto wallet?", a: [
    "You need a wallet on Celo to pay. MiniPay (inside Opera Mini) works great and is free. Any Celo wallet like Valora or MetaMask also works.",
    "Your ticket is not stuck inside the wallet. You get a normal link with a QR code you can open on any phone.",
  ] },
  { cat: "Fans", q: "How do I get into the event?", a: [
    "Open your ticket link and show the QR code at the door. The organizer scans it with their phone. Each code works once, so a screenshot shared with someone else won't get them in after you.",
  ] },
  { cat: "Fans", q: "Can I buy for a friend?", a: [
    "If the organizer allows more than one ticket per person, yes, up to that number. Your friend can also verify and buy their own in a couple of minutes.",
  ] },
  { cat: "Fans", q: "What if the event is cancelled?", a: [
    "Refunds are handled by the organizer, the same way they would be at the gate. Their name and the event details are on every event page. Kovenra pays organizers instantly, so we don't hold your money.",
  ] },

  // Organizers
  { cat: "Organizers", top: true, q: "How much does it cost to sell on Kovenra?", a: [
    "Listing is free and there's no monthly fee. Fans who pay in dollars cover a small conversion buffer (about 0.6%) so your naira always arrives in full. cNGN payments go straight to you.",
    "See the pricing page for the full breakdown.",
  ] },
  { cat: "Organizers", top: true, q: "How do I get my money?", a: [
    "Automatically. When a fan pays in USD₮, Kovenra converts exactly that payment to cNGN on Textile FX and sends it to your wallet within seconds. If they pay in cNGN, it goes to you directly.",
    "cNGN is the official naira stablecoin. You can hold it, spend it, or cash it out to any Nigerian bank through the cNGN app, Busha or Quidax.",
  ] },
  { cat: "Organizers", q: "Do I need an account?", a: [
    "No sign-up. You fill one short form and get two links: a public event page to share, and a private dashboard link. Keep the dashboard link safe, because it works like a key.",
  ] },
  { cat: "Organizers", q: "How does check-in work?", a: [
    "Open your dashboard on your phone and tap Door scanner. Point the camera at a ticket. Green means welcome in, amber means it was already used, red means it isn't a valid Kovenra ticket for your event.",
    "You can open the scanner on several phones at once for a busy gate.",
  ] },
  { cat: "Organizers", q: "Can I sell to people outside Lagos or outside Nigeria?", a: [
    "Yes. Kovenra isn't tied to any city. Events can be anywhere in Nigeria, and fans abroad can pay in dollars while you still receive naira.",
  ] },
  { cat: "Organizers", q: "Can I turn off the verified-humans rule?", a: [
    "Yes, it's a switch on the create form. We recommend keeping it on for anything likely to sell out, because that's where bots and touts do the most damage.",
  ] },

  // Money
  { cat: "Money", top: true, q: "What are USD₮ and cNGN?", a: [
    "USD₮ is a digital dollar (Tether) and cNGN is a digital naira. Both live on Celo, a fast network with very low fees. One cNGN is always worth one naira.",
  ] },
  { cat: "Money", q: "Who pays gas fees?", a: [
    "USD₮ payments are gasless for fans: you sign, and Celo's x402 facilitator submits the transaction. Kovenra pays the small fees for converting and paying out.",
  ] },
  { cat: "Money", q: "Where does the exchange rate come from?", a: [
    "From Textile FX, live. The landing page shows the current rate and it refreshes every 30 seconds. The dollar price on an event page is worked out from that rate when you buy.",
  ] },
  { cat: "Money", q: "Does Kovenra ever hold my money?", a: [
    "Only for the few seconds between a USD₮ payment and its conversion to naira. cNGN payments never touch Kovenra at all. Every step is a public transaction you can check on Celoscan from the Live proof page.",
  ] },

  // Privacy
  { cat: "Privacy", top: true, q: "Does Kovenra see my passport or my name?", a: [
    "No. Self checks your passport on your own phone and only shares a proof: that you're a real, unique person and, if needed, that you're over 18. Kovenra never receives your name, photo, passport number or birthday.",
  ] },
  { cat: "Privacy", q: "What does Kovenra store about me?", a: [
    "An anonymous number from Self that's the same each time you buy (so we can count one ticket per person), your wallet address, and the payment transaction. Nothing that says who you are.",
  ] },
  { cat: "Privacy", q: "Can the organizer see who I am?", a: [
    "No. They see that a verified person bought a ticket and how they paid. That's it.",
  ] },

  // Agents
  { cat: "Agents", top: true, q: "Can an AI agent buy a ticket for me?", a: [
    "Yes, as long as it carries a Self Agent ID that links it to you. It signs its request, pays the 402 over x402, and gets your ticket back. All of your agents share your one limit, so nobody can run a hundred bots to clear a show.",
  ] },
  { cat: "Agents", q: "Where are the docs for agents?", a: [
    "Start with the For agents page and the skill file at /skill.md. Any agent that can read a URL can follow it.",
  ] },
  { cat: "Agents", q: "What is x402?", a: [
    "A simple way to pay for things over the web. The server answers 402 Payment Required with a price, the client signs a payment, and the server settles it on-chain before giving you what you paid for.",
  ] },
];
