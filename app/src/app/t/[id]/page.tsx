import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { celoscanTx, eventDate, naira, usd } from "@/lib/format";
import ResaleBox from "@/components/ResaleBox";
import { getStore } from "@/lib/store";
import { ticketCode } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const isNew = (await searchParams).new === "1";
  const store = getStore();
  const t = await store.getTicket(id);
  if (!t) notFound();
  const e = await store.getEvent(t.eventId);
  if (!e) notFound();
  const code = ticketCode(t.id);
  const qr = await QRCode.toDataURL(code, { margin: 1, width: 480, errorCorrectionLevel: "M" });
  const used = t.status === "used";
  const resold = t.status === "resold";
  const listed = t.status === "listed";
  const canResell = (t.status === "valid" || listed) && Date.parse(e.startsAt) > Date.now();

  return (
    <div className="wrap narrow section stack">
      {isNew && <div className="notice notice-good">You&apos;re in. Screenshot this or keep the link: it&apos;s your ticket.</div>}
      <div className="ticket">
        <div className="ticket-top stack">
          <div className="row between">
            <span className="ev-date">{eventDate(e.startsAt)}</span>
            {used ? <span className="pill pill-bad">Used</span>
              : resold ? <span className="pill pill-bad">Resold</span>
              : listed ? <span className="pill pill-gold">Listed for resale</span>
              : <span className="pill pill-good"><span className="dot" /> Valid</span>}
          </div>
          <h2>{e.title}</h2>
          <div className="muted">{e.venue}, {e.city}</div>
          <div className="row small muted" style={{ gap: 14 }}>
            <span>Admit one</span>
            {e.humansOnly && <span>Verified person</span>}
            {e.minAge > 0 && <span>{e.minAge}+</span>}
          </div>
        </div>
        <div className="ticket-cut" />
        <div className="ticket-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Ticket QR code" style={{ opacity: used || resold || listed ? 0.3 : 1 }} />
          <div className="mono small faint">{t.id}</div>
          {resold && <div className="small muted">This ticket was resold at face value. The QR no longer works.</div>}
          {t.resale && <div className="small gold">Bought at face value from a fan who couldn&apos;t go.</div>}
          {used && <div className="small muted">Checked in {t.checkedInAt ? new Date(t.checkedInAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) : ""}</div>}
        </div>
      </div>
      <div className="list">
        <div className="list-row">
          <span className="muted">Paid</span>
          <span>{t.paidToken === "USDT" ? `${usd(t.paidAmount)} USD₮` : `${naira(t.paidAmount)} cNGN`}</span>
        </div>
        <div className="list-row">
          <span className="muted">Payment</span>
          <a className="mono" href={celoscanTx(t.paymentTx)} target="_blank" rel="noreferrer">{t.paymentTx.slice(0, 10)}… ↗</a>
        </div>
        {t.resale ? (
          <div className="list-row">
            <span className="muted">Seller refunded</span>
            <span>{t.resale.sellerPaidTx ? <a href={celoscanTx(t.resale.sellerPaidTx)} target="_blank" rel="noreferrer">Paid at face value ↗</a> : "Sending…"}</span>
          </div>
        ) : (
        <div className="list-row">
          <span className="muted">Organizer received</span>
          <span>
            {t.settleStatus === "paid" || t.settleStatus === "direct"
              ? `${naira(t.ngnDelivered ?? "0")} in naira`
              : t.settleStatus === "failed" ? "Converting (retrying)" : "Converting to naira…"}
            {t.payoutTx && <> · <a href={celoscanTx(t.payoutTx)} target="_blank" rel="noreferrer">tx ↗</a></>}
          </span>
        </div>
        )}
      </div>
      {canResell && <ResaleBox id={t.id} code={code} listed={listed} priceLabel={naira(e.priceNgn)} />}
    </div>
  );
}
