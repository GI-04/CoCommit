import type { Metadata } from "next";

const description = "CoCommit's privacy policy, cookies and browser storage, terms of service and copyright notice.";

export const metadata: Metadata = {
  title: "Legal",
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "/legal" },
  // No `openGraph` here: setting it in a child segment drops the root share image (opengraph-image.tsx).
  // og:title and og:description are filled in from the title and description above.
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
