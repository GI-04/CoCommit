"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { Icon } from "@/components/icons";
import { shortAgo } from "@/lib/desk";
import { collapseTabs, filterFiles, folderEntries, folderOf, matchFiles, pathTabs, pathTones, siblingTones, type DrawerFilter, type DrawerTone } from "@/lib/drawer";
import { timeAgo } from "@/lib/home";

export type RowMeta = { author: string; at: string };
type View = "edit" | "diff";

const FILTERS: { id: DrawerFilter; label: (n: number) => string }[] = [
  { id: "all", label: () => "All files" },
  { id: "changed", label: (n) => `Changed ${n}` },
  { id: "code", label: () => "Code" },
  { id: "docs", label: () => "Docs" },
];

const baseName = (p: string) => p.split("/").pop() ?? p;

// The index drawer (PLAN/2026-10-22-repo-page-magic.md, Trin's option A): one colour strip per folder level, like the index
// tabs in the moodboard. On each strip the folder you're in stands tall and joins the strip below it; its siblings sit
// beside it, shorter (tap one to switch, tap a tall tab higher up to go back). The open folder is a layer of rows. Colours
// go by position among siblings, so neighbours differ and no tab matches its strip. A sentence of filter words and
// "Go to file" (⌘K) sit on top. `folded` (phone, a file open) shrinks the layer to the open file.
export function IndexDrawer({
  files,
  loading,
  rootLabel,
  folder,
  onFolder,
  selected,
  onOpen,
  changed,
  branchChanged,
  edited,
  meta,
  filter,
  onFilter,
  searchRef,
  folded = false,
  onUnfold,
}: {
  files: string[];
  loading: boolean;
  rootLabel: string;
  folder: string;
  onFolder: (folder: string) => void;
  selected: string | null;
  onOpen: (path: string, view?: View) => void;
  /** Files changed on the branch plus unsaved edits (the "Changed" filter). */
  changed: ReadonlySet<string>;
  /** Files changed on the branch compared with the default branch (they open in the Diff view from the filter). */
  branchChanged: ReadonlySet<string>;
  edited: ReadonlySet<string>;
  meta: (path: string) => RowMeta | undefined;
  filter: DrawerFilter;
  onFilter: (f: DrawerFilter) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  folded?: boolean;
  onUnfold?: () => void;
}) {
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const tabs = useMemo(() => collapseTabs(pathTabs(folder, rootLabel), 5), [folder, rootLabel]);
  const tones = useMemo(() => pathTones(files, folder), [files, folder]);
  const toneOf = (p: string): DrawerTone => tones.get(p) ?? "paper";
  const entries = useMemo(() => folderEntries(files, folder), [files, folder]);
  const childTones = siblingTones(entries.folders.length, toneOf(folder));
  const matches = useMemo(() => matchFiles(files, query, 100), [files, query]);
  const flat = useMemo(() => (filter === "all" ? null : filterFiles(files, filter, changed)), [files, filter, changed]);

  const openFromList = (p: string) => onOpen(p, branchChanged.has(p) && !edited.has(p) && filter === "changed" ? "diff" : "edit");

  // ↑ / ↓ move between rows, Backspace goes up one folder (not while typing in the search box).
  const onKeys = (e: KeyboardEvent<HTMLElement>) => {
    if (e.target instanceof HTMLInputElement) return;
    const rows = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-row]")];
    const at = rows.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      rows[Math.min(Math.max(at + (e.key === "ArrowDown" ? 1 : -1), 0), rows.length - 1)]?.focus();
    } else if (e.key === "Backspace" && folder) {
      e.preventDefault();
      onFolder(folderOf(folder));
    }
  };

  // A folder tab. "open": the folder you're in (stands tall, joins its layer); "path": a folder above it (tall, tap to go
  // back); "side": a sibling on the same strip (shorter, tap to switch).
  const tab = (path: string, label: string, tone: DrawerTone, state: "open" | "path" | "side") => {
    const tall = state !== "side";
    const look = `drawer-tab tone-${tone} shrink-0 truncate font-serif leading-tight ${tall ? "max-w-[10rem] px-4 pb-1 pt-1.5 text-[17px]" : "max-w-[8rem] px-2.5 pb-0 pt-0.5 text-[14px] opacity-85 hover:opacity-100"}`;
    // Keeps the tall tab in view when a strip has more siblings than fit (the strip scrolls sideways).
    const keepInView = (el: HTMLElement | null) => {
      const row = el?.parentElement;
      if (el && tall && row && el.offsetLeft + el.offsetWidth > row.clientWidth) row.scrollLeft = el.offsetLeft - 8;
    };
    return state === "open" ? (
      <span key={path} ref={keepInView} className={`${look} inline-block`} aria-current="location">
        {label}
      </span>
    ) : (
      <button key={path} ref={keepInView} type="button" onClick={() => onFolder(path)} title={state === "path" ? `Back to ${path || rootLabel}` : `Open ${path}`} className={look}>
        {label}
      </button>
    );
  };

  const fileRow = (p: string, i: number, showPath = false) => {
    const m = meta(p);
    const isEdited = edited.has(p);
    const active = selected === p;
    const slash = p.lastIndexOf("/");
    return (
      <li key={p} className="rise" style={{ "--d": `${Math.min(i, 10) * 30}ms` } as React.CSSProperties}>
        <button
          type="button"
          data-row
          onClick={() => (showPath ? openFromList(p) : onOpen(p))}
          title={p}
          aria-current={active ? "true" : undefined}
          className={`flex w-full min-w-0 items-center gap-2.5 rounded-lg border-[1.5px] px-2.5 py-1.5 text-left font-mono text-xs ${
            active ? "border-black bg-paper" : "border-transparent hover:bg-black/10"
          }`}
        >
          <Icon name="file" className="size-3.5 shrink-0 opacity-80" />
          <span className="min-w-0 flex-1 truncate">
            {baseName(p)}
            {showPath && slash >= 0 && <span className="ml-2 opacity-60">{p.slice(0, slash)}</span>}
          </span>
          <span className="shrink-0 opacity-65">{isEdited ? "not saved" : m ? `${shortAgo(timeAgo(m.at))} · ${m.author}` : ""}</span>
          {isEdited && <span aria-label="edited, not saved" className="h-4 w-2.5 shrink-0 rounded-t-sm border border-black bg-mustard" />}
        </button>
      </li>
    );
  };

  const layerRows = (
    <ul className="space-y-0.5" aria-label={folder ? `Files in ${folder}` : `Files in ${rootLabel}`}>
      {entries.folders.map((f, i) => (
        <li key={f.path} className="rise" style={{ "--d": `${Math.min(i, 10) * 30}ms` } as React.CSSProperties}>
          <button type="button" data-row onClick={() => onFolder(f.path)} className="flex w-full min-w-0 items-center gap-2.5 rounded-lg border-[1.5px] border-transparent px-2.5 py-1.5 text-left font-mono text-xs hover:bg-black/10">
            <span aria-hidden className={`tone-${childTones[i]} h-2.5 w-3.5 shrink-0 rounded-t-[3px] border border-black bg-[var(--tone)]`} />
            <span className="min-w-0 flex-1 truncate">{f.name}/</span>
            <span className="shrink-0 opacity-65">{f.count === 1 ? "1 file" : `${f.count} files`}</span>
          </button>
        </li>
      ))}
      {entries.files.map((f, i) => fileRow(f.path, i + entries.folders.length))}
      {!entries.folders.length && !entries.files.length && <li className="px-2.5 py-1.5 text-xs">{loading ? "Loading…" : "This folder is empty."}</li>}
    </ul>
  );

  return (
    <div ref={rootRef} onKeyDown={onKeys} className="min-w-0">
      {!folded && (
        <>
          <p className="mb-3 text-lg font-semibold leading-snug" role="group" aria-label="Show">
            {FILTERS.map((f, i) => (
              <span key={f.id}>
                <button type="button" aria-pressed={filter === f.id} onClick={() => onFilter(f.id)} className={filter === f.id ? "text-white" : "text-white/40 hover:text-white/75"}>
                  {f.label(changed.size)}
                </button>
                {i < FILTERS.length - 1 && <span className="text-white/40">, </span>}
              </span>
            ))}
          </p>
          <label className="glass mb-3 flex items-center gap-2.5 rounded-full px-4 py-2.5">
            <Icon name="search" className="size-4 shrink-0 text-white/80" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
                if (e.key === "Enter" && matches[0]) {
                  onOpen(matches[0]);
                  setQuery("");
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  rootRef.current?.querySelector<HTMLElement>("[data-row]")?.focus();
                }
              }}
              placeholder="Go to file"
              aria-label="Go to file"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/60"
            />
            <kbd className="hidden shrink-0 font-sans text-xs text-white/45 sm:inline">⌘K</kbd>
          </label>
        </>
      )}

      {query.trim() ? (
        <div className="tone-paper drawer-layer p-2">
          <p className="px-2.5 pb-1 text-xs font-medium">{matches.length ? `${matches.length === 100 ? "100+" : matches.length} found` : "No file matches."}</p>
          <ul className="space-y-0.5">{matches.map((p, i) => fileRow(p, i, true))}</ul>
        </div>
      ) : flat ? (
        <div className={`tone-${filter === "changed" ? "mustard" : filter === "code" ? "cyan" : "green"} drawer-layer drawer-open p-2`} key={filter}>
          <p className="px-2.5 pb-1 text-xs font-medium">
            {filter === "changed" ? "Changed on this branch, and your unsaved edits" : filter === "code" ? "Code files" : "Docs"} · {flat.length}
          </p>
          <ul className="space-y-0.5">{flat.length ? flat.map((p, i) => fileRow(p, i, true)) : <li className="px-2.5 py-1.5 text-xs">Nothing here yet.</li>}</ul>
        </div>
      ) : (
        <div>
          {tab("", rootLabel, "pink", folder ? "path" : "open")}
          {tabs.slice(1).map((t, j) => {
            // The strip for this level is the parent's colour; the "…" tab stands for the folders hidden in between.
            const parent = t.hidden ? "" : folderOf(t.path);
            const siblings = t.hidden ? [] : folderEntries(files, parent).folders;
            const sibTones = siblingTones(siblings.length, toneOf(parent));
            return (
              <div key={`${parent}:${j}`} role="group" aria-label={`Folders in ${parent || rootLabel}`} className={`drawer-row tone-${toneOf(parent)} ${j === 0 ? "rounded-tr-md" : ""}`}>
                {t.hidden
                  ? tab(t.path, `… ${t.hidden} more`, toneOf(t.path), "side")
                  : siblings.map((sib, k) => tab(sib.path, sib.name, sibTones[k], sib.path === folder ? "open" : sib.path === t.path ? "path" : "side"))}
              </div>
            );
          })}
          <div key={folder} className={`drawer-layer drawer-open tone-${toneOf(folder)} p-2 ${folder ? "" : "rounded-tr-md"}`}>
            {folded && selected ? (
              <>
                <ul>{fileRow(selected, 0)}</ul>
                <button type="button" onClick={onUnfold} className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium hover:bg-black/10">
                  {`${Math.max(entries.files.length + entries.folders.length - 1, 0)} more in ${folder ? baseName(folder) : rootLabel} · open the drawer`}
                </button>
              </>
            ) : (
              layerRows
            )}
          </div>
          {!folded && folder && <p className="mt-2.5 text-xs text-white/50">Tap a tab to switch folders.</p>}
        </div>
      )}
    </div>
  );
}
