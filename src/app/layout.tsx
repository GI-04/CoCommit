import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { NAV_WIDTH_SCRIPT } from "@/lib/nav-width";
import { BING_SITE_VERIFICATION, GOOGLE_SITE_VERIFICATION, SITE_URL, openGraphBase } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });
// The editorial serif of the Repository page (repo name, drawer tabs), from the "repo page idea" Figma frames.
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument" });

// Pages are noindex unless they opt in with `robots: { index: true, follow: true }` (only the PUBLIC_PATHS in site.ts do):
// app pages need a login or show the demo team (PLAN/2026-10-18-seo-pass.md).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "CoCommit", template: "%s · CoCommit" },
  description: "Git without the terminal, plus chat and shared AI context for small teams.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: true },
  openGraph: openGraphBase,
  twitter: { card: "summary_large_image" },
  // Search Console / Bing ownership tags, printed only once the codes are filled in (src/lib/site.ts).
  verification: {
    ...(GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : {}),
    ...(BING_SITE_VERIFICATION ? { other: { "msvalidate.01": BING_SITE_VERIFICATION } } : {}),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f1f1f",
};

// The head script puts a saved sidebar width on <html> before the first paint (src/lib/nav-width.ts), so React is told
// not to mind that <html> has a style and data-nav it didn't render.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NAV_WIDTH_SCRIPT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
