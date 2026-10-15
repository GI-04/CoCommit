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
    <nav className="sticky top-0 flex h-dvh w-52 shrink-0 flex-col gap-1 border-r border-line bg-surface p-4">
      <Link href="/" className="mb-4 px-3 text-lg font-bold">
        CoCommit
      </Link>
      {sections.map((s) => (
        <Link key={s.href} href={s.href} className={item(s.href)}>
          {s.label}
        </Link>
      ))}
      <p className="mt-6 px-3 text-xs uppercase tracking-wide text-muted">Coming soon</p>
      {comingSoon.map((s) => (
        <Link key={s.href} href={s.href} className={`${item(s.href)} text-muted`}>
          {s.label}
        </Link>
      ))}
      <UserChip />
    </nav>
  );
}
