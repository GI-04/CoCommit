// Turns a unified diff (GitHub's `patch`, or `git diff` output) into rows with line numbers for the Repository diff
// panel. Pure, no imports, so tests and the browser can both load it.

export type DiffLine = {
  /** "meta" = file headers and "\ No newline" notes, "hunk" = an @@ line. */
  kind: "meta" | "hunk" | "add" | "del" | "ctx";
  text: string;
  oldNo?: number;
  newNo?: number;
};

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function parsePatch(patch: string): DiffLine[] {
  if (!patch.trim()) return [];
  const rows: DiffLine[] = [];
  let oldNo = 0;
  let newNo = 0;
  let inHunk = false;
  for (const raw of patch.replace(/\r?\n$/, "").split("\n")) {
    const hunk = HUNK.exec(raw);
    if (hunk) {
      oldNo = Number(hunk[1]);
      newNo = Number(hunk[2]);
      inHunk = true;
      rows.push({ kind: "hunk", text: raw });
    } else if (!inHunk || raw.startsWith("\\")) {
      rows.push({ kind: "meta", text: raw });
    } else if (raw.startsWith("+")) {
      rows.push({ kind: "add", text: raw.slice(1), newNo: newNo++ });
    } else if (raw.startsWith("-")) {
      rows.push({ kind: "del", text: raw.slice(1), oldNo: oldNo++ });
    } else {
      rows.push({ kind: "ctx", text: raw.startsWith(" ") ? raw.slice(1) : raw, oldNo: oldNo++, newNo: newNo++ });
    }
  }
  return rows;
}
