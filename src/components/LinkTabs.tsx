import Link from "next/link";

// The glass tab pill as page links (Messages: Chat / Team / Call). Same look as `Tabs` in ui.tsx, which stays free of
// next/link so tests can load it.
export function LinkTabs({ tabs, value, label }: { tabs: { id: string; label: string; href: string }[]; value: string; label: string }) {
  return (
    <nav aria-label={label} className="glass inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5 lg:p-2">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <Link
            key={t.id}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-medium lg:px-10 lg:py-[17px] lg:text-base ${active ? "glass-thumb text-white" : "text-white/85 hover:bg-white/10"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
