// Shared files (PLAN/2026-10-16-files.md, folders and big files: PLAN/2026-10-16-drive-folders.md).
// Pure helpers: no network or Next.js, so tests can load this on its own.
// Files live in the team's repo under COCOMMIT/files/ (folders inside it) and are committed through the normal git code.

/** Where shared files live in the repo. */
export const FILES_FOLDER = "COCOMMIT/files";

/** Most file bytes one request carries. The API body limit is 4.5 MB and base64 adds a third, so 3 MB fits. */
export const PART_BYTES = 3 * 1024 * 1024;

/** Largest file we accept. Files over PART_BYTES go up and come down in PART_BYTES pieces. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Most pieces one file can have. */
export const MAX_PARTS = Math.ceil(MAX_FILE_BYTES / PART_BYTES);

/** How many folders deep the shared folder goes. */
export const MAX_FOLDER_DEPTH = 4;

/** Git keeps no empty folders, so a new folder holds this empty hidden file. */
export const FOLDER_MARKER = ".keep";

/** One file in the shared folder. `folder` is relative to COCOMMIT/files ("" for the top, "designs/logos" deeper). */
export type SharedFile = { name: string; folder: string; path: string; size: number };

/** Everything in the shared folder: the files and the paths of the folder marker files. */
export type SharedListing = { files: SharedFile[]; markers: string[] };

const tidy = (s: string) => s.replace(/[^\w.\- ]+/g, "-").replace(/\s+/g, " ").trim().replace(/^[.\-]+/, "");

/** A name that is safe as a single path segment: no folders, no odd characters, never empty or hidden. */
export function cleanName(raw: string): string {
  const base = String(raw ?? "").split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  const tail = tidy(ext.slice(1)).slice(0, 12);
  const name = `${tidy(stem).slice(0, 80)}${tail ? `.${tail}` : ""}`;
  return name.replace(/^\.+/, "") || "file";
}

/** A folder name that is safe as a single path segment, or "" when nothing usable is left. */
export function cleanFolderName(raw: string): string {
  return tidy(String(raw ?? "").replace(/[\\/]+/g, " ")).slice(0, 60).replace(/^[.\- ]+|[.\- ]+$/g, "");
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

/** How many PART_BYTES pieces a file of `size` bytes takes (an empty file is still one). */
export const partCount = (size: number): number => Math.max(1, Math.ceil(size / PART_BYTES));

const goodSegment = (s: string) => s !== "" && !s.startsWith(".") && !s.includes("\\");

/** True for a folder path relative to COCOMMIT/files: "" (the top) or up to MAX_FOLDER_DEPTH plain parts. */
export function isFolderPath(folder: string): boolean {
  if (folder === "") return true;
  if (typeof folder !== "string") return false;
  const parts = folder.split("/");
  return parts.length <= MAX_FOLDER_DEPTH && parts.every(goodSegment);
}

/** The repo path of `name` in `folder` (relative to COCOMMIT/files). */
export const sharedPath = (folder: string, name: string): string => `${FILES_FOLDER}/${folder ? `${folder}/` : ""}${name}`;

/** Splits a repo path under COCOMMIT/files into its folder and name, or null when it isn't under it. */
export function splitShared(path: string): { folder: string; name: string } | null {
  if (typeof path !== "string" || !path.startsWith(`${FILES_FOLDER}/`)) return null;
  const rel = path.slice(FILES_FOLDER.length + 1);
  if (rel.startsWith("/")) return null;
  const cut = rel.lastIndexOf("/");
  return { folder: cut < 0 ? "" : rel.slice(0, cut), name: rel.slice(cut + 1) };
}

/** True for a file inside the shared folder (in a folder at most MAX_FOLDER_DEPTH deep, no "..", nothing hidden). */
export function isSharedPath(path: string): boolean {
  const at = splitShared(path);
  return at !== null && goodSegment(at.name) && isFolderPath(at.folder);
}

/** True for a folder marker file (COCOMMIT/files/<folder>/.keep). */
export function isMarkerPath(path: string): boolean {
  const at = splitShared(path);
  return at !== null && at.name === FOLDER_MARKER && at.folder !== "" && isFolderPath(at.folder);
}

/** Every folder in the listing, parents included, sorted. */
export function allFolders(listing: SharedListing): string[] {
  const out = new Set<string>();
  const add = (folder: string) => {
    const parts = folder.split("/");
    for (let i = 1; i <= parts.length; i++) out.add(parts.slice(0, i).join("/"));
  };
  for (const f of listing.files) if (f.folder) add(f.folder);
  for (const m of listing.markers) {
    const at = splitShared(m);
    if (at?.folder) add(at.folder);
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}

const inside = (folder: string, parent: string) => folder === parent || folder.startsWith(`${parent}/`);

/** What one folder shows: its direct subfolders and its own files. */
export function folderView(listing: SharedListing, folder: string): { folders: { name: string; path: string }[]; files: SharedFile[] } {
  const depth = folder ? folder.split("/").length : 0;
  const folders = allFolders(listing)
    .filter((f) => f.split("/").length === depth + 1 && (folder === "" || f.startsWith(`${folder}/`)))
    .map((path) => ({ name: path.split("/").pop() ?? path, path }));
  return { folders, files: listing.files.filter((f) => f.folder === folder) };
}

/** Every repo path inside `folder` (its files, subfolders' files and marker files): what deleting the folder removes. */
export function pathsInFolder(listing: SharedListing, folder: string): string[] {
  if (!folder) return [];
  return [
    ...listing.files.filter((f) => inside(f.folder, folder)).map((f) => f.path),
    ...listing.markers.filter((m) => inside(splitShared(m)?.folder ?? "", folder)),
  ];
}

/** Breadcrumb steps for `folder`: [{ name: "designs", path: "designs" }, { name: "logos", path: "designs/logos" }]. */
export function crumbs(folder: string): { name: string; path: string }[] {
  if (!folder) return [];
  const parts = folder.split("/");
  return parts.map((name, i) => ({ name, path: parts.slice(0, i + 1).join("/") }));
}
