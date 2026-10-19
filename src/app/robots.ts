import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// App pages stay crawlable on purpose: they carry <meta name="robots" content="noindex">, which a crawler
// only sees if it may fetch the page. Only API and sign-in callback routes are off limits.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
