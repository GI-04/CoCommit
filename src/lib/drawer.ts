// The index drawer on the Repository page (PLAN/2026-10-22-repo-page-magic.md): one colour strip per folder level, the open
// folder's tab standing tall among its siblings (like index tabs), the open folder a layer of rows. Pure, no imports, so tests can load it on its own.

export type DrawerFolder = { name: string; path: string; count: number };
export type DrawerFile = { name: string; path: string };
export type DrawerTab = { label: string; path: string; hidden?: number };
export type DrawerTone = "pink" | "cyan" | "mustard" | "green" | "paper" | "clay";
export type DrawerFilter = "all" | "changed" | "code" | "docs";

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

/** What one folder holds ("" = the repo root): its subfolders (with how many files are inside each) and its own files, sorted. */
export function folderEntries(paths: string[], folder: string): { folders: DrawerFolder[]; files: DrawerFile[] } {
  const prefix = folder ? `${folder}/` : "";
  const counts = new Map<string, number>();
  const files: DrawerFile[] = [];
  for (const p of paths) {
    if (!p.startsWith(prefix)) continue;
    const rest = p.slice(prefix.length);
    if (!rest) continue;
    const slash = rest.indexOf("/");
    if (slash < 0) files.push({ name: rest, path: p });
    else counts.set(rest.slice(0, slash), (counts.get(rest.slice(0, slash)) ?? 0) + 1);
  }
  const folders = [...counts].map(([name, count]) => ({ name, path: `${prefix}${name}`, count })).sort((a, b) => byName(a.name, b.name));
  return { folders, files: files.sort((a, b) => byName(a.name, b.name)) };
}

/** The tabs from the root to `folder`: the root is labelled with the repo's name. */
export function pathTabs(folder: string, rootLabel: string): DrawerTab[] {
  const parts = folder.split("/").filter(Boolean);
  return [{ label: rootLabel, path: "" }, ...parts.map((label, i) => ({ label, path: parts.slice(0, i + 1).join("/") }))];
}

/** Deep folders keep the root and the last `max - 2` tabs; one "…" tab stands for the ones in between and opens the last of them. */
export function collapseTabs(tabs: DrawerTab[], max = 5): DrawerTab[] {
  if (tabs.length <= max || max < 3) return tabs;
  const keep = max - 2;
  const hidden = tabs.slice(1, tabs.length - keep);
  return [tabs[0], { label: "…", path: hidden[hidden.length - 1].path, hidden: hidden.length }, ...tabs.slice(tabs.length - keep)];
}

const TONES: DrawerTone[] = ["cyan", "mustard", "green", "paper", "clay"];

/** A small stable hash (FNV-1a). */
export function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Colours for the folders on one strip (siblings, in their sorted order): by position, so neighbours always differ and a
 * folder keeps its colour; never the colour of the strip they sit on (`parentTone`).
 */
export function siblingTones(count: number, parentTone: DrawerTone | null): DrawerTone[] {
  const pool = TONES.filter((t) => t !== parentTone);
  return Array.from({ length: count }, (_, k) => pool[k % pool.length]);
}

/**
 * Every folder's colour from the root down to `folder` (root = pink): each one is coloured by its place among its
 * siblings on its parent's strip. The rows of an open folder use the same rule, so a folder's tab-icon colour in the
 * list is the colour its tab gets when you open it.
 */
export function pathTones(paths: string[], folder: string): Map<string, DrawerTone> {
  const out = new Map<string, DrawerTone>([["", "pink"]]);
  let parent = "";
  for (const part of folder.split("/").filter(Boolean)) {
    const here = parent ? `${parent}/${part}` : part;
    const siblings = folderEntries(paths, parent).folders;
    const tones = siblingTones(siblings.length, out.get(parent) ?? "pink");
    const k = siblings.findIndex((f) => f.path === here);
    out.set(here, k >= 0 ? tones[k] : TONES[hashText(here) % TONES.length]);
    parent = here;
  }
  return out;
}

const CODE = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs", "css", "scss", "html", "rs", "py", "go", "java", "kt", "swift", "c", "h", "cpp", "cs", "rb", "php", "sh", "sql", "vue", "svelte"]);
const DOCS = new Set(["md", "mdx", "txt", "rst", "adoc", "pdf"]);

export function extension(path: string): string {
  const name = path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/**
 * The files a filter word picks, as a flat list (sorted by path). "changed" is the set the page passes in: files changed on
 * the branch plus files edited and not saved yet.
 */
export function filterFiles(paths: string[], filter: DrawerFilter, changed: ReadonlySet<string> = new Set()): string[] {
  if (filter === "all") return paths;
  const keep = (p: string) =>
    filter === "changed" ? changed.has(p) : filter === "code" ? CODE.has(extension(p)) : DOCS.has(extension(p)) || /^(readme|license|changelog)$/i.test(p.split("/").pop() ?? "");
  const pool = filter === "changed" ? [...new Set([...paths, ...changed])] : paths;
  return pool.filter(keep).sort(byName);
}

/** "Go to file": paths containing the words typed (in any order), file-name matches first, at most `limit`. */
export function matchFiles(paths: string[], query: string, limit = 200): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits = paths.filter((p) => {
    const low = p.toLowerCase();
    return words.every((w) => low.includes(w));
  });
  const nameHit = (p: string) => (words.every((w) => (p.split("/").pop() ?? "").toLowerCase().includes(w)) ? 0 : 1);
  return hits.sort((a, b) => nameHit(a) - nameHit(b) || a.length - b.length || byName(a, b)).slice(0, limit);
}

/** The folder a file sits in ("src/app/page.tsx" → "src/app"; a root file → ""). */
export function folderOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}
