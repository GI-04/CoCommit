// Facts about the public site used in <head> tags, robots.txt, sitemap.xml and the share image
// (PLAN/2026-10-18-seo-pass.md). Only "/" and "/legal" are meant for search engines; every other page is noindex.

export const SITE_URL = "https://cocommit.vercel.app";
export const SITE_NAME = "CoCommit";

// Google shows about 155 characters; keep this under that.
export const LANDING_DESCRIPTION =
  "Git without the terminal: commit, push and open pull requests with buttons, plus team chat, files and shared AI context. For small teams and beginners.";

// The pages listed in sitemap.xml and opted back in to indexing.
export const PUBLIC_PATHS = ["/", "/legal"] as const;

// Same colours as globals.css (--canvas, --blue, the four colour blocks).
export const BRAND = {
  canvas: "#1f1f1f",
  blue: "#1f4ae0",
  muted: "#b0b0b0",
  blocks: ["#ff79bf", "#00a9d8", "#d8a500", "#68ca27"],
} as const;

// Base Open Graph fields. A page that sets its own `openGraph` replaces the parent's, so it spreads this first.
export const openGraphBase = { siteName: SITE_NAME, type: "website", locale: "en_US" } as const;
