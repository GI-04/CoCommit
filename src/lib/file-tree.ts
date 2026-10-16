// Turns the flat list of file paths into the folder rows the Repo page shows, like GitHub's file browser.
// Pure: no imports, so tests can load it on its own.

export type TreeRow = { kind: "folder" | "file"; name: string; path: string; depth: number };

type Node = { folders: Map<string, Node>; files: string[] };

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

function build(paths: string[]): Node {
  const root: Node = { folders: new Map(), files: [] };
  for (const p of paths) {
    const parts = p.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    let node = root;
    for (const part of parts.slice(0, -1)) {
      let next = node.folders.get(part);
      if (!next) node.folders.set(part, (next = { folders: new Map(), files: [] }));
      node = next;
    }
    node.files.push(parts[parts.length - 1]);
  }
  return root;
}

/**
 * The rows to draw: in every folder, subfolders first, then files, each sorted by name. A folder's contents
 * appear only while its path is in `expanded`.
 */
export function treeRows(paths: string[], expanded: ReadonlySet<string>): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (node: Node, prefix: string, depth: number) => {
    for (const name of [...node.folders.keys()].sort(byName)) {
      const path = `${prefix}${name}`;
      rows.push({ kind: "folder", name, path, depth });
      if (expanded.has(path)) walk(node.folders.get(name)!, `${path}/`, depth + 1);
    }
    for (const name of [...node.files].sort(byName)) rows.push({ kind: "file", name, path: `${prefix}${name}`, depth });
  };
  walk(build(paths), "", 0);
  return rows;
}

/** Every parent folder of `path`, outermost first: "a/b/c.txt" → ["a", "a/b"]. */
export function parentFolders(path: string): string[] {
  const parts = path.split("/").filter(Boolean).slice(0, -1);
  return parts.map((_, i) => parts.slice(0, i + 1).join("/"));
}
