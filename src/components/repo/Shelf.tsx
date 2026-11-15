"use client";

import type { Activity } from "@/lib/github-types";
import { authorTone, spineHeight } from "@/lib/desk";
import { timeAgo } from "@/lib/home";

export const spineKey = (c: Activity) => `${c.at}|${c.text}`;

// "Recent saves": the branch's latest commits as book spines on a shelf, oldest on the left. Colour = who saved it, height
// is decorative but stable (GitHub's commit list has no sizes, q7:a). Hover or focus a spine for who, what and when.
// `fresh` is the spine that just landed (it drops in with a spring).
export function Shelf({ commits, fresh }: { commits: Activity[]; fresh: string | null }) {
  if (!commits.length) return null;
  const shown = [...commits].reverse();
  return (
    <div className="flex items-end gap-3">
      <span className="pb-1 text-xs text-white/55">Recent saves</span>
      <div>
        <ul className="flex h-12 items-end gap-[3px]" aria-label="Recent saves, oldest first">
          {shown.map((c, i) => {
            const key = spineKey(c);
            const words = `${c.author} · ${c.text} · ${timeAgo(c.at)}`;
            return (
              <li key={`${key}:${i}`} className="group relative">
                <span
                  tabIndex={0}
                  aria-label={words}
                  className={`spine tone-${authorTone(c.author)} block w-2.5 ${key === fresh ? "spine-drop" : ""}`}
                  style={{ height: spineHeight(key) }}
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute right-0 top-full z-20 mt-2.5 hidden w-max max-w-[16rem] items-center gap-1.5 rounded-lg border border-black bg-paper px-2.5 py-1 text-xs font-medium text-black shadow-[0_12px_24px_-12px_rgba(0,0,0,0.8)] group-hover:flex group-focus-within:flex"
                >
                  <span aria-hidden className={`tone-${authorTone(c.author)} size-2 shrink-0 rounded-full border border-black bg-[var(--tone)]`} />
                  <span className="truncate">{words}</span>
                </span>
              </li>
            );
          })}
        </ul>
        <div aria-hidden className="h-[3px] rounded-full bg-white/35" />
      </div>
    </div>
  );
}
