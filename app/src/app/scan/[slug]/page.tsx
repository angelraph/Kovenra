"use client";

import jsQR from "jsqr";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { adminKeyFor } from "@/lib/client/admin";

type Result = { result: string; message: string; ticketId?: string } | null;
type Door = { ticketId: string; qr: string | null; stage: "starting" | "scan" | "checking" } | null;

export default function Scanner({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [key, setKey] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [count, setCount] = useState(0);
  const [door, setDoor] = useState<Door>(null);
  const busy = useRef(false);
  const doorRun = useRef(0);
  const doorActive = useRef(false);

  // VIP door check: the ticket QR was valid; now the guest proves with their own passport.
  async function runDoorCheck(ticketId: string) {
    if (!key) return;
    const run = ++doorRun.current;
    doorActive.current = true;
    setDoor({ ticketId, qr: null, stage: "starting" });
    try {
      const { startDoorCheck, confirmDoor } = await import("@/lib/client/buyer");
      const s = await startDoorCheck();
      const qr = await QRCode.toDataURL(s.deepLink, { margin: 1, width: 320 });
      if (run !== doorRun.current) return;
      setDoor({ ticketId, qr, stage: "scan" });
      const guestKey = await s.done;
      if (run !== doorRun.current) return;
      setDoor({ ticketId, qr: null, stage: "checking" });
      const r = await confirmDoor(slug, key, ticketId, guestKey);
      if (run !== doorRun.current) return;
      setResult(r);
      if (r.result === "ok") setCount((c) => c + 1);
      if (navigator.vibrate) navigator.vibrate(r.result === "ok" ? 80 : [200, 100, 200]);
    } catch {
      if (run === doorRun.current) setResult({ result: "invalid", message: "Self check didn't finish. Scan the ticket again to retry." });
    } finally {
      if (run === doorRun.current) { setDoor(null); doorActive.current = false; }
    }
  }

  function cancelDoor() {
    doorRun.current++;
    doorActive.current = false;
    setDoor(null);
    setResult(null);
  }
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  async function check(code: string) {
    if (!key || busy.current || doorActive.current) return;
    if (last.current.code === code && Date.now() - last.current.at < 4000) return;
    busy.current = true;
    last.current = { code, at: Date.now() };
    try {
      const res = await fetch(`/api/events/${slug}/checkin`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ code }),
      });
      const r = (await res.json()) as Result;
      setResult(res.status === 403 ? { result: "invalid", message: "Scanner link not valid for this event" } : r);
      if (r?.result === "ok") setCount((c) => c + 1);
      if (r?.result === "self_required" && r.ticketId) runDoorCheck(r.ticketId);
      if (navigator.vibrate) navigator.vibrate(r?.result === "ok" || r?.result === "self_required" ? 80 : [60, 60, 60]);
    } catch {
      setResult({ result: "invalid", message: "No connection. Try again." });
    } finally {
      busy.current = false;
    }
  }

  useEffect(() => {
    setKey(adminKeyFor(slug));
  }, [slug]);

  useEffect(() => {
    if (!key) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = () => {
          const v = video.current, c = canvas.current;
          if (v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            const ctx = c.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(v, 0, 0, c.width, c.height);
              const img = ctx.getImageData(0, 0, c.width, c.height);
              const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
              if (qr?.data) check(qr.data);
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setCamError("Camera not available. Allow camera access, or type the ticket code below.");
      }
    })();
    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key) return <div className="wrap narrow section"><div className="notice notice-bad">Open the scanner from your organizer dashboard.</div></div>;

  return (
    <div className="wrap narrow section stack scanner">
      <div className="row between">
        <h2>Door scanner</h2>
        <span className="pill pill-good">{count} in this session</span>
      </div>
      {door && (
        <div className="card stack" style={{ textAlign: "center" }}>
          <b>VIP door check</b>
          {door.stage === "starting" && <p className="muted">Getting the Self code ready…</p>}
          {door.stage === "scan" && door.qr && (
            <>
              <p>Ask the guest to open <b>their own Self app</b> and scan this code with their passport.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={door.qr} alt="Self code for the guest" style={{ width: 260, height: 260, margin: "0 auto", background: "#fff", borderRadius: 12, padding: 8 }} />
              <p className="small muted">Kovenra only checks that it is the same passport that bought the ticket. No name is shared.</p>
            </>
          )}
          {door.stage === "checking" && <p className="muted">Checking the passport matches the buyer…</p>}
          <button className="btn btn-sm" onClick={cancelDoor}>Cancel</button>
        </div>
      )}
      {camError ? <div className="notice">{camError}</div> : <video ref={video} playsInline muted style={door ? { display: "none" } : undefined} />}
      <canvas ref={canvas} hidden />
      {result && (
        <div className={`result ${result.result === "ok" ? "result-ok" : result.result === "used" || result.result === "self_required" ? "result-used" : "result-bad"}`}>
          {result.result === "ok" ? "✓ " : result.result === "used" || result.result === "self_required" ? "! " : "✕ "}{result.message}
        </div>
      )}
      <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); if (manual) check(manual.trim()); }}>
        <input placeholder="kv1.tkt_…" value={manual} onChange={(e) => setManual(e.target.value)} className="mono" />
        <button className="btn btn-sm">Check</button>
      </form>
      <Link href={`/dashboard/${slug}`} className="small muted">← Back to dashboard</Link>
    </div>
  );
}
