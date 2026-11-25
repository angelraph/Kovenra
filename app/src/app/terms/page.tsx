import PageHead from "@/components/PageHead";

export const metadata = { title: "Terms", description: "The simple rules for using Kovenra." };

export default function Terms() {
  return (
    <>
      <PageHead crumb="Terms" eyebrow="Legal" title="Terms of use" lead="The plain-language rules for using Kovenra. Last updated November 2026." />
      <section className="wrap" style={{ paddingBottom: 90 }}>
        <div className="prose">
          <h2>What Kovenra is</h2>
          <p>Kovenra is a ticketing tool. Organizers list events, fans buy tickets, and payments settle on the Celo blockchain. We are not the organizer of the events listed here, and we don&apos;t run them.</p>
          <h2>For organizers</h2>
          <ul>
            <li>You&apos;re responsible for your event: that it happens as described, that it&apos;s legal, and for any refunds if it&apos;s cancelled or changed.</li>
            <li>Keep your private dashboard link safe. Anyone with it can see your sales and open your door scanner.</li>
            <li>Make sure the payout wallet you enter is yours. Payments sent to a wrong address can&apos;t be reversed.</li>
          </ul>
          <h2>For fans</h2>
          <ul>
            <li>Tickets are for your own use, up to the limit the organizer set. Trying to get around the one-person rule (for example with someone else&apos;s passport) isn&apos;t allowed.</li>
            <li>A ticket works once at the door. Keep your ticket link to yourself.</li>
            <li>Questions about the event itself, including refunds, go to the organizer, whose name is on the event page.</li>
          </ul>
          <h2>Payments</h2>
          <p>Payments are made in USD₮ or cNGN on Celo and settle on-chain before a ticket is issued. Blockchain payments are final. Kovenra never takes cards or bank transfers.</p>
          <h2>Agents</h2>
          <p>AI agents may buy on behalf of the verified person they belong to. They follow the same rules and the same limits as that person.</p>
          <h2>If something goes wrong</h2>
          <p>We work hard to keep Kovenra running well, but it&apos;s provided as it is. We can&apos;t be responsible for losses caused by events, wallets, networks or services outside our control.</p>
          <h2>Changes</h2>
          <p>We may update these terms as Kovenra grows. If we make a big change, we&apos;ll say so on the site.</p>
        </div>
      </section>
    </>
  );
}
