// File modes for commits made from the app (PLAN/2026-10-16-demo-polish-kin.md, item 2).
// Pure: no network or Next.js, so tests can load it on its own. src/lib/github.ts fetches the branch's
// file list (GET git/trees/<sha>?recursive=1) and passes it here.
import type { FileEdit } from "./github-types";

export const MODE_FILE = "100644";
export const MODE_EXECUTABLE = "100755";
export const MODE_SYMLINK = "120000";
export const MODE_SUBMODULE = "160000";

/** One entry of GitHub's tree listing (only the fields used here). */
export type TreeListing = { path: string; mode: string; type?: string };

/** One entry of the tree to create (GitHub's POST git/trees). */
export type TreeEntry =
  | { path: string; mode: string; type: "blob"; content: string }
  | { path: string; mode: string; type: "blob"; sha: string }
  | { path: string; mode: string; type: "blob"; sha: null };

/** A file the app shouldn't change: a symlink or a submodule. */
export class GitModeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitModeError";
  }
}

/** path → mode for every file the branch has. A truncated listing simply misses some paths. */
export function modesByPath(tree: TreeListing[]): Map<string, string> {
  return new Map(tree.filter((t) => t.type !== "tree").map((t) => [t.path, t.mode]));
}

/**
 * The tree entries for a commit, keeping each existing file's mode:
 * - an edited file keeps its mode (an executable script stays 100755);
 * - a new file, or one a truncated listing didn't include, is a plain file (100644);
 * - a deleted file is removed with its own mode;
 * - symlinks (120000) and submodules (160000) are refused, so they're never overwritten as plain files.
 * - a file whose bytes were already uploaded as a blob (`blobs`: path → blob id, used for binary files) points at that blob.
 */
export function treeEntries(files: FileEdit[], modes: Map<string, string>, blobs: Map<string, string> = new Map()): TreeEntry[] {
  return files.map((f) => {
    const mode = modes.get(f.path);
    if (mode === MODE_SYMLINK) throw new GitModeError(`${f.path} is a symlink: edit it with git, not in the app.`);
    if (mode === MODE_SUBMODULE) throw new GitModeError(`${f.path} is a submodule: change it with git, not in the app.`);
    const keep = mode === MODE_EXECUTABLE ? MODE_EXECUTABLE : MODE_FILE;
    const blob = blobs.get(f.path);
    if (blob && f.content !== null) return { path: f.path, mode: keep, type: "blob", sha: blob };
    return f.content === null ? { path: f.path, mode: keep, type: "blob", sha: null } : { path: f.path, mode: keep, type: "blob", content: f.content };
  });
}
