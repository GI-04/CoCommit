import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { NAV_WIDTH_SCRIPT } from "@/lib/nav-width";
import { SITE_URL, openGraphBase } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

// Pages are noindex unless they opt in with `robots: { index: true, follow: true }` (only "/" and "/legal" do):
// app pages need a login or show the demo team (PLAN/2026-10-18-seo-pass.md).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "CoCommit", template: "%s · CoCommit" },
  description: "Git without the terminal, plus chat and shared AI context for small teams.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: true },
  openGraph: openGraphBase,
  twitter: { card: "summary_large_image" },
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
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NAV_WIDTH_SCRIPT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
