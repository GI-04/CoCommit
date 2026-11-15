import type { Metadata } from "next";

// The desktop sign-in ticket travels in these pages' address: never pass it on to another site in a Referer header.
export const metadata: Metadata = { title: "Signing in", referrer: "no-referrer" };

export default function DesktopSignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
