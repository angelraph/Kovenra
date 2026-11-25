"use client";

/** The organizer's private key arrives in the URL hash once, then lives on this device. */
export function adminKeyFor(slug: string): string | null {
  if (typeof window === "undefined") return null;
  const m = /key=([A-Za-z0-9_-]+)/.exec(window.location.hash);
  if (m) {
    try {
      localStorage.setItem(`kovenra:admin:${slug}`, m[1]);
    } catch {}
    history.replaceState(null, "", window.location.pathname);
    return m[1];
  }
  try {
    return localStorage.getItem(`kovenra:admin:${slug}`);
  } catch {
    return null;
  }
}
