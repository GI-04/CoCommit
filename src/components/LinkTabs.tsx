"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Where each tab group's glass thumb was last. It lives at module level so it survives the page change (every tab here is
// its own page): the new page starts the thumb at the old tab and slides it to the new one.
const lastIndex = new Map<string, number>();

// The glass tab pill as page links (Messages: Chat / Team / Call). Same look and slide as `Tabs` in ui.tsx, which stays
// free of next/link and React so tests can load it.
export function LinkTabs({ tabs, value, label }: { tabs: { id: string; label: string; href: string }[]; value: string; label: string }) {
  const index = tabs.findIndex((t) => t.id === value);
  const [shown, setShown] = useState(() => lastIndex.get(label) ?? index);
  const thumb = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    lastIndex.set(label, index);
    if (shown === index) return;
    thumb.current?.getBoundingClientRect(); // settle the starting place first, so the move below animates
    setShown(index);
  }, [index, label, shown]);

  return (
    <nav aria-label={label} className="glass max-w-full overflow-x-auto rounded-full">
      <div className="relative inline-grid w-max min-w-full auto-cols-fr grid-flow-col p-[var(--pad)] [--pad:0.375rem] lg:[--pad:0.5rem]">
        <span
          ref={thumb}
          aria-hidden
          className={`glass-thumb pointer-events-none absolute bottom-[var(--pad)] left-[var(--pad)] top-[var(--pad)] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${index < 0 ? "opacity-0" : ""}`}
          style={{ width: `calc((100% - 2 * var(--pad)) / ${tabs.length})`, transform: `translateX(${Math.max(shown, 0) * 100}%)` }}
        />
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={t.id === value ? "page" : undefined}
            className={`relative z-10 whitespace-nowrap rounded-full px-5 py-2.5 text-center text-sm font-medium lg:px-8 lg:py-[17px] lg:text-base ${tabs.length <= 3 ? "lg:min-w-[11rem]" : ""} ${t.id === value ? "text-white" : "text-white/85 hover:text-white"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
