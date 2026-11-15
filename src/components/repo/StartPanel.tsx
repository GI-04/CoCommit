"use client";

import { useMemo } from "react";
import { Icon } from "@/components/icons";
import { authorTone } from "@/lib/desk";
import type { Activity } from "@/lib/github-types";
import { timeAgo } from "@/lib/home";
import { inlineText, parseMarkdown } from "@/lib/markdown-lite";

/** The README's first heading and first paragraph, for the preview card. */
function summary(source: string): { title: string; body: string } {
  const blocks = parseMarkdown(source);
  const heading = blocks.find((b) => b.type === "heading");
  const para = blocks.find((b) => b.type === "paragraph");
  const body = para && para.type === "paragraph" ? inlineText(para.children) : "";
  return { title: heading && heading.type === "heading" ? inlineText(heading.children) : "", body: body.length > 260 ? `${body.slice(0, 257)}…` : body };
}

// What the editor area shows before you pick a file: an invitation, the README's opening (tap to open it) and the
// latest saves on this branch. Instead of an empty "No file picked" panel.
export function StartPanel({ readme, onOpen, lately, onSearch }: { readme: { path: string; text: string } | null; onOpen: (path: string) => void; lately: Activity[]; onSearch: () => void }) {
  const r = useMemo(() => (readme ? summary(readme.text) : null), [readme]);
  return (
    <div className="space-y-5 p-6 lg:p-7">
      <div>
        <h2 className="font-serif text-[2.5rem] leading-none text-white lg:text-[2.75rem]">Pick a file to start.</h2>
        <p className="mt-3 max-w-prose text-sm text-white/70">
          Open a file from the drawer, or{" "}
          <button type="button" onClick={onSearch} className="font-medium text-white underline underline-offset-2">
            press ⌘K and type its name
          </button>
          . Your edits wait on your desk until you save them.
        </p>
      </div>
      {readme && r && (
        <button type="button" onClick={() => onOpen(readme.path)} className="lift block w-full rounded-2xl border-[1.5px] border-black bg-paper p-4 text-left text-black">
          <span className="flex items-center gap-2 border-b border-black/10 pb-2.5 text-sm font-semibold">
            <Icon name="file" className="size-4" />
            <span className="flex-1">{readme.path}</span>
            <span className="text-xs font-medium text-black/65">Open →</span>
          </span>
          {r.title && <span className="mt-3 block font-serif text-2xl leading-tight">{r.title}</span>}
          {r.body && <span className="mt-1.5 block text-sm text-black/75">{r.body}</span>}
        </button>
      )}
      {lately.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Lately on this branch</h3>
          <ul className="mt-3 space-y-3">
            {lately.slice(0, 3).map((c, i) => (
              <li key={`${c.at}${i}`} className="flex items-center gap-3">
                <span aria-hidden className={`spine tone-${authorTone(c.author)} block h-9 w-2.5 shrink-0`} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{c.text}</span>
                  <span className="block text-xs text-white/55">{`${c.author} · ${timeAgo(c.at)}`}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
