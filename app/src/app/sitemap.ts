import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getStore } from "@/lib/store";

export const revalidate = 300;

const PAGES = ["", "/events", "/how-it-works", "/organizers", "/fans", "/agents", "/pricing", "/faq", "/about", "/trust", "/proof", "/verify", "/brand", "/contact", "/terms", "/privacy", "/new"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.baseUrl;
  const pages: MetadataRoute.Sitemap = PAGES.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }));
  try {
    const events = await getStore().listEvents(200);
    for (const e of events) {
      pages.push({ url: `${base}/e/${e.slug}`, changeFrequency: "daily", priority: 0.8 });
      pages.push({ url: `${base}/e/${e.slug}/fair`, changeFrequency: "daily", priority: 0.5 });
    }
  } catch {
    /* the static pages are still worth listing */
  }
  return pages;
}
