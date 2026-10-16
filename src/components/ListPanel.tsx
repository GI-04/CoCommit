"use client";

import type { ReactNode } from "react";
import { Initials } from "@/components/Avatar";
import { Tabs } from "@/components/ui";

export type ListItem = { id: string; title: string; sub?: string; short: string };

// The left list of the Messages screens (chats, teams): a paper panel with the picked row in cyan. On narrow screens it
// becomes a row of pill tabs above the content so the page stays one column.
export function ListPanel({ title, items, value, onSelect, children }: { title: string; items: ListItem[]; value: string; onSelect: (id: string) => void; children?: ReactNode }) {
  return (
    <>
      <div className="lg:hidden">
        <Tabs label={title} value={value} onChange={onSelect} tabs={items.map((i) => ({ id: i.id, label: i.title }))} />
      </div>
      <aside aria-label={title} className="bg-surface hidden min-h-0 flex-col overflow-y-auto rounded-lg border border-line p-4 lg:flex">
        <h2 className="mb-3 px-1 text-base font-semibold">{title}</h2>
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => onSelect(i.id)}
                aria-current={i.id === value ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left ${i.id === value ? "border-black bg-cyan" : "border-transparent hover:bg-fg/10"}`}
              >
                <Initials text={i.short} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{i.title}</span>
                  {i.sub && <span className="block truncate text-xs text-muted">{i.sub}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {children}
      </aside>
    </>
  );
}

/** "GI-04/CoCommit" → the repo name as the title, the owner underneath, "CO" in the badge. */
export const repoItem = (fullName: string): ListItem => {
  const [owner, name] = fullName.split("/");
  return { id: fullName, title: name ?? fullName, sub: owner, short: (name ?? fullName).slice(0, 2) };
};
