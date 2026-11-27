"use client";

import { useEffect, useState } from "react";

/**
 * A tap-to-open page for the Self app. Self's own redirect page tries to open the app on page load,
 * which Chrome on Android blocks (no user tap), then always jumps to the Play Store after a second.
 * Here the person taps a real link, so Android lets it open Self, and nothing redirects on its own.
 */
export default function OpenSelf() {
  const [query, setQuery] = useState("");
  const [os, setOs] = useState<"android" | "ios" | "other">("other");

  useEffect(() => {
    setQuery(window.location.search);
    const ua = navigator.userAgent;
    setOs(/Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) ? "ios" : "other");
  }, []);

  // The Self app answers https://redirect.self.xyz links (verified App Link), not the old proofofpassport:// scheme.
  const appLink =
    os === "android"
      ? `intent://redirect.self.xyz/${query}#Intent;scheme=https;package=com.proofofpassportapp;end`
      : `https://redirect.self.xyz/${query}`;
  const store =
    os === "ios" ? "https://apps.apple.com/app/id6478563710" : "https://play.google.com/store/apps/details?id=com.proofofpassportapp";

  return (
    <main className="wrap" style={{ maxWidth: 520, padding: "64px 20px", textAlign: "center" }}>
      <h1 style={{ fontSize: 30 }}>Confirm with Self</h1>
      <p className="muted" style={{ marginTop: 12 }}>
        Tap the button to open the Self app and approve. Then go back to your ticket page (MiniPay). It moves on by itself.
      </p>
      {query ? (
        <a className="btn btn-block" href={appLink} style={{ marginTop: 28, fontSize: 18, padding: "18px 20px" }}>
          Open Self
        </a>
      ) : (
        <p className="notice notice-bad" style={{ marginTop: 28 }}>This link is missing its Self request. Go back to the ticket page and copy it again.</p>
      )}
      <p className="small faint" style={{ marginTop: 22 }}>
        Self didn&apos;t open? Make sure the Self app is updated, then tap again. Don&apos;t have it yet?{" "}
        <a href={store} style={{ textDecoration: "underline" }}>Get Self</a>, add your passport, then come back to this page.
      </p>
    </main>
  );
}
