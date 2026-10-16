"use client";

import { useMemo, useState } from "react";
import { parentFolders, treeRows } from "@/lib/file-tree";

const folderColor = "text-mustard";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`}>
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden className={`shrink-0 ${folderColor}`}>
      {open ? (
        <path fill="currentColor" d="M1.5 4A1.5 1.5 0 0 1 3 2.5h3l1.5 1.5H13A1.5 1.5 0 0 1 14.5 5.5V6H4.2a1.5 1.5 0 0 0-1.45 1.1L1.5 11.6V4Zm1.7 4.1A.5.5 0 0 1 3.7 7.7h11.1a.5.5 0 0 1 .48.64l-1.4 4.7a1 1 0 0 1-.96.71H2.5a.5.5 0 0 1-.48-.64L3.2 8.1Z" />
      ) : (
        <path fill="currentColor" d="M1.5 4A1.5 1.5 0 0 1 3 2.5h3l1.5 1.5H13A1.5 1.5 0 0 1 14.5 5.5v6A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5V4Z" />
      )}
    </svg>
  );
}

function FileIcon({ name }: { name: string }) {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const tint =
    { ts: "text-blue-700", tsx: "text-blue-700", js: "text-mustard", mjs: "text-mustard", json: "text-mustard", md: "text-green", css: "text-pink", rs: "text-clay", yml: "text-clay", yaml: "text-clay" }[ext] ?? "text-muted";
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden className={`shrink-0 ${tint}`}>
      <path d="M4 1.75h5L12.5 5.25V13.5a.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V2.5A.75.75 0 0 1 4 1.75Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9 1.75v3.5h3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

/** GitHub-style file browser: folders you open and close, an icon per file type, a find box that lists matches. */
export function FileTree({ files, selected, onOpen }: { files: string[]; selected: string | null; onOpen: (path: string) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const rows = useMemo(() => treeRows(files, expanded), [files, expanded]);
  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? files.filter((f) => f.toLowerCase().includes(q)).slice(0, 200) : null;
  }, [files, filter]);

  const toggle = (folder: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(folder)) next.add(folder);
      return next;
    });

  const open = (path: string) => {
    // Opening a match from the find box also opens its folders for when the box is cleared.
    setExpanded((prev) => new Set([...prev, ...parentFolders(path)]));
    onOpen(path);
  };

  const rowClass = (active: boolean) =>
    `flex w-full items-center gap-2 truncate rounded-lg border py-1.5 pr-2 text-left text-sm ${
      active ? "border-black bg-cyan font-medium" : "border-transparent hover:bg-fg/10"
    }`;

  return (
    <div>
      <div className="relative mb-3">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Go to file"
          aria-label="Find a file"
          className="w-full rounded-full border border-black bg-bg py-2 pl-9 pr-4 text-sm"
        />
      </div>

      <ul className="max-h-[24rem] space-y-px overflow-y-auto" role={matches ? "list" : "tree"}>
        {matches
          ? matches.map((f) => {
              const slash = f.lastIndexOf("/");
              return (
                <li key={f}>
                  <button onClick={() => open(f)} className={`${rowClass(selected === f)} pl-2`} title={f}>
                    <FileIcon name={f} />
                    <span className="truncate">
                      {f.slice(slash + 1)}
                      {slash >= 0 && <span className="ml-2 text-xs text-muted">{f.slice(0, slash)}</span>}
                    </span>
                  </button>
                </li>
              );
            })
          : rows.map((r) => {
              const isOpen = r.kind === "folder" && expanded.has(r.path);
              return (
                <li key={`${r.kind}:${r.path}`} role="treeitem" aria-expanded={r.kind === "folder" ? isOpen : undefined} aria-selected={selected === r.path}>
                  <button
                    onClick={() => (r.kind === "folder" ? toggle(r.path) : onOpen(r.path))}
                    style={{ paddingLeft: `${0.35 + r.depth * 1.1}rem` }}
                    className={rowClass(selected === r.path)}
                    title={r.path}
                  >
                    <span className="flex w-3 justify-center">{r.kind === "folder" && <Chevron open={isOpen} />}</span>
                    {r.kind === "folder" ? <FolderIcon open={isOpen} /> : <FileIcon name={r.name} />}
                    <span className="truncate">{r.name}</span>
                  </button>
                </li>
              );
            })}
        {!(matches ?? rows).length && <li className="px-2 py-1 text-sm text-muted">{files.length ? "No match." : "Loading…"}</li>}
      </ul>
    </div>
  );
}
