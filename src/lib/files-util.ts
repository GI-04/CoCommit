// Shared files (PLAN/2026-10-16-files.md). Pure helpers: no network or Next.js, so tests can load this on its own.
// Files live in the team's repo under COCOMMIT/files/ and are committed through the normal git code.

/** Where shared files live in the repo. */
export const FILES_FOLDER = "COCOMMIT/files";

/** Largest file we accept. The API body limit is 4.5 MB and base64 adds a third, so 3 MB of file fits. */
export const MAX_FILE_BYTES = 3 * 1024 * 1024;

/** One file in the shared folder. */
export type SharedFile = { name: string; path: string; size: number };

/** A name that is safe as a single path segment: no folders, no odd characters, never empty or hidden. */
export function cleanName(raw: string): string {
  const base = String(raw ?? "").split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  const fix = (s: string) => s.replace(/[^\w.\- ]+/g, "-").replace(/\s+/g, " ").trim().replace(/^[.\-]+/, "");
  const tail = fix(ext.slice(1)).slice(0, 12);
  const name = `${fix(stem).slice(0, 80)}${tail ? `.${tail}` : ""}`;
  return name.replace(/^\.+/, "") || "file";
}

/** `name`, or `name (2).ext`, `name (3).ext` … when `taken` already has it (compared ignoring case). */
export function uniqueName(name: string, taken: string[]): string {
  const used = new Set(taken.map((t) => t.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let n = 2; ; n++) {
    const candidate = `${stem} (${n})${ext}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

/** "12 B", "3.4 KB", "1.2 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** True for a path directly inside the shared folder (no subfolders, no "..", not hidden). */
export function isSharedPath(path: string): boolean {
  if (typeof path !== "string" || !path.startsWith(`${FILES_FOLDER}/`)) return false;
  const name = path.slice(FILES_FOLDER.length + 1);
  return name !== "" && !name.includes("/") && !name.includes("\\") && !name.startsWith(".");
}
