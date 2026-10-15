import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoCommit",
  description: "Git without the terminal, plus chat and shared AI context for small teams.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh">
        <Nav />
        <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
      </body>
    </html>
  );
}
