"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { comingSoon, sections } from "@/lib/sections";
import { UserChip } from "@/components/UserChip";

export function Nav() {
  const path = usePathname();
  const item = (href: string) =>
    `block rounded-md px-3 py-2 text-sm ${path.startsWith(href) ? "bg-accent text-accent-fg" : "hover:bg-line/60"}`;

  return (
    <nav aria-label="Main navigation" className="flex w-full shrink-0 flex-wrap items-center gap-1 border-b border-line bg-surface p-3 md:sticky md:top-0 md:h-dvh md:w-52 md:flex-col md:items-stretch md:border-b-0 md:border-r md:p-4">
      <Link href="/" className="mr-auto px-3 text-lg font-bold md:mb-4 md:mr-0">
        CoCommit
      </Link>
      {sections.map((s) => (
        <Link key={s.href} href={s.href} className={item(s.href)}>
          {s.label}
        </Link>
      ))}
      <p className="mt-6 hidden px-3 text-xs uppercase tracking-wide text-muted md:block">Coming soon</p>
      {comingSoon.map((s) => (
        <Link key={s.href} href={s.href} className={`${item(s.href)} hidden text-muted md:block`}>
          {s.label}
        </Link>
      ))}
      <UserChip />
    </nav>
  );
}
