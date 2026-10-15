"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/Nav";

// The landing page at "/" brings its own header; every app page gets the sidebar.
export function AppShell({ children }: { children: React.ReactNode }) {
  if (usePathname() === "/") return <>{children}</>;
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Nav />
      <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
