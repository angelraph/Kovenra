import PageHead from "@/components/PageHead";
import { Reveal } from "@/components/motion";
import { celoscanTx, naira, usd } from "@/lib/format";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live proof", description: "Every ticket sold on Kovenra, with its payment, naira conversion and payout on Celo." };

export default async function Proof() {
  let rows: Awaited<ReturnType<ReturnType<typeof getStore>["allTickets"]>> = [];
  const titles = new Map<string, string>();
  let blocked = 0;
  try {
    const store = getStore();
    rows = await store.allTickets(300);
    for (const t of rows) if (!titles.has(t.eventId)) titles.set(t.eventId, (await store.getEvent(t.eventId))?.title ?? "");
    for (const e of await store.listEvents(500)) blocked += (await store.rejections(e.id)).length;
  } catch {}
  const ngn = rows.reduce((s, t) => s + BigInt(t.ngnDelivered ?? (t.paidToken === "CNGN" ? t.paidAmount : "0")), 0n);

  return (
    <>
      <PageHead crumb="Live proof" eyebrow="Live record" title="Every sale, out in the open" lead="Each ticket on Kovenra is a real payment on Celo mainnet. Here's every one, with links to check the payment, the naira conversion and the payout yourself. Buyers stay anonymous." />
      <section className="wrap" style={{ paddingBottom: 90 }}>
        <div className="hair hair-3">
          <div><span className="eyebrow">Tickets sold</span><div className="big-num" style={{ marginTop: 14 }}>{rows.length}</div></div>
          <div><span className="eyebrow">Paid to organizers</span><div className="big-num" style={{ marginTop: 14 }}>{naira(ngn)}</div></div>
          <div><span className="eyebrow">Bots turned away</span><div className="big-num goldtext" style={{ marginTop: 14 }}>{blocked}</div></div>
        </div>
        <Reveal>
          <div className="list" style={{ marginTop: 22 }}>
            {rows.length === 0 && <div className="list-row muted">No sales yet. The first one will appear here with its transactions.</div>}
            {rows.map((t) => (
              <div className="list-row" key={t.id}>
                <span style={{ fontWeight: 600 }}>{titles.get(t.eventId)}</span>
                <span className="small muted">{new Date(t.createdAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</span>
                <span className="small">{t.paidToken === "USDT" ? `${usd(t.paidAmount)} USD₮` : `${naira(t.paidAmount)} cNGN`}</span>
                <span className="small">
                  <a className="gold" href={celoscanTx(t.paymentTx)} target="_blank" rel="noreferrer">payment ↗</a>
                  {t.swapTx && <> · <a className="gold" href={celoscanTx(t.swapTx)} target="_blank" rel="noreferrer">conversion ↗</a></>}
                  {t.payoutTx && <> · <a className="gold" href={celoscanTx(t.payoutTx)} target="_blank" rel="noreferrer">naira payout ↗</a></>}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
        <p className="small faint" style={{ marginTop: 14 }}>Every conversion and payout Kovenra sends carries our ERC-8021 attribution tag, so you can find them all on Celoscan. The buyer&apos;s payment itself is sent by Celo&apos;s x402 service, not by Kovenra, so it doesn&apos;t carry our tag.</p>
      </section>
    </>
  );
}
