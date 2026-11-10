"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Where each tab group's glass thumb was last, and when that page went away. It lives at module level so it survives the
// page change (every tab here is its own page): the new page starts the thumb at the old tab and slides it to the new
// one. A place older than a couple of seconds is forgotten, so coming back from another screen doesn't replay a slide.
const last = new Map<string, { index: number; left: number }>();
const fresh = (label: string) => {
  const seen = last.get(label);
  return seen && Date.now() - seen.left < 2000 ? seen.index : undefined;
};

// The glass tab pill as page links (Messages: Chat / Team / Call). Same look and slide as `Tabs` in ui.tsx, which stays
// free of next/link and React so tests can load it.
export function LinkTabs({ tabs, value, label }: { tabs: { id: string; label: string; href: string }[]; value: string; label: string }) {
  const index = tabs.findIndex((t) => t.id === value);
  const [shown, setShown] = useState(() => fresh(label) ?? index);
  const thumb = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    last.set(label, { index, left: Infinity });
    if (shown === index) return;
    thumb.current?.getBoundingClientRect(); // settle the starting place first, so the move below animates
    // Which way it goes, so the glass stretches toward the new tab (.slide-thumb in globals.css).
    if (thumb.current?.parentElement) thumb.current.parentElement.dataset.slide = index > shown ? "next" : "back";
    setShown(index);
  }, [index, label, shown]);

  // When the page goes away, note the time: the next tab page started within 2 s slides from here.
  useEffect(() => () => void last.set(label, { index, left: Date.now() }), [index, label]);

  return (
    <nav aria-label={label} className="glass max-w-full overflow-x-auto rounded-full">
      <div className="relative inline-grid w-max min-w-full auto-cols-fr grid-flow-col p-[var(--pad)] [--pad:0.375rem] lg:[--pad:0.5rem]">
        <span aria-hidden className="slide-clip">
          <span
            ref={thumb}
            className={`slide-thumb absolute bottom-[var(--pad)] left-[var(--pad)] top-[var(--pad)] ${index < 0 ? "opacity-0" : ""}`}
            style={{ width: `calc((100% - 2 * var(--pad)) / ${tabs.length})`, transform: `translateX(${Math.max(shown, 0) * 100}%)` }}
          >
            <span key={shown} className="glass-thumb stretch-x block size-full rounded-full" />
          </span>
        </span>
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
