import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard/", "/scan/", "/t/", "/owner", "/api/"] }],
    sitemap: `${env.baseUrl}/sitemap.xml`,
  };
}
