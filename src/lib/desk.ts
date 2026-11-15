// The desk on the Repository page (PLAN/2026-10-22-repo-page-magic.md): every edited file is a sticky note until you save,
// the step rail says where you are, the "Recent saves" shelf shows commits as spines. Pure, no imports, so tests can load it.

export type NoteTone = "mustard" | "pink" | "cyan" | "green" | "clay";
export type TeamTone = "pink" | "cyan" | "mustard" | "green";

/** One line of a line-by-line comparison: kept, added (only in the new text) or removed (only in the old one). */
export type LineOp = { kind: "ctx" | "add" | "del"; text: string; oldNo?: number; newNo?: number };

/** Above this many cells (old lines × new lines, after the common start and end are cut off) the middle is not compared. */
const LCS_LIMIT = 4_000_000;

function splitLines(text: string): string[] {
  return text === "" ? [] : text.replace(/\r\n/g, "\n").split("\n");
}

/**
 * Compares two versions of a file line by line (longest common subsequence after trimming the shared start and end). Too
 * big a middle counts as all removed then all added, so it stays fast on huge files.
 */
export function diffLines(before: string, after: string): LineOp[] {
  const a = splitLines(before);
  const b = splitLines(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const ops: LineOp[] = [];
  for (let i = 0; i < start; i++) ops.push({ kind: "ctx", text: a[i], oldNo: i + 1, newNo: i + 1 });
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;
  if (n && m && n * m <= LCS_LIMIT) {
    // lcs[i][j] = longest common run of midA[i..] and midB[j..], one flat array.
    const w = m + 1;
    const lcs = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i * w + j] = midA[i] === midB[j] ? lcs[(i + 1) * w + j + 1] + 1 : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && midA[i] === midB[j]) {
        ops.push({ kind: "ctx", text: midA[i], oldNo: start + i + 1, newNo: start + j + 1 });
        i++;
        j++;
      } else if (i < n && (j === m || lcs[(i + 1) * w + j] >= lcs[i * w + j + 1])) {
        // Removed lines before added ones, as in GitHub's diffs.
        ops.push({ kind: "del", text: midA[i], oldNo: start + i + 1 });
        i++;
      } else {
        ops.push({ kind: "add", text: midB[j], newNo: start + j + 1 });
        j++;
      }
    }
  } else {
    midA.forEach((text, i) => ops.push({ kind: "del", text, oldNo: start + i + 1 }));
    midB.forEach((text, j) => ops.push({ kind: "add", text, newNo: start + j + 1 }));
  }
  for (let k = 0; k < a.length - endA; k++) ops.push({ kind: "ctx", text: a[endA + k], oldNo: endA + k + 1, newNo: endB + k + 1 });
  return ops;
}

/** How many lines were added and removed, and which lines of the new text are new or changed (1-based), for the editor's marks. */
export function lineChanges(before: string, after: string): { added: number; removed: number; marks: number[] } {
  if (before === after) return { added: 0, removed: 0, marks: [] };
  const ops = diffLines(before, after);
  const marks: number[] = [];
  let removed = 0;
  for (const op of ops) {
    if (op.kind === "add") marks.push(op.newNo!);
    else if (op.kind === "del") removed++;
  }
  return { added: marks.length, removed, marks };
}

/** The edits as a unified diff with 3 lines of context around each change, so DiffView can show them like GitHub's. */
export function editPatch(before: string, after: string, context = 3): string {
  const ops = diffLines(before, after);
  const changed = ops.map((op, i) => (op.kind === "ctx" ? -1 : i)).filter((i) => i >= 0);
  if (!changed.length) return "";
  // Group changes whose context windows touch into hunks.
  const hunks: [number, number][] = [];
  for (const i of changed) {
    const from = Math.max(0, i - context);
    const to = Math.min(ops.length - 1, i + context);
    const last = hunks[hunks.length - 1];
    if (last && from <= last[1] + 1) last[1] = Math.max(last[1], to);
    else hunks.push([from, to]);
  }
  const out: string[] = [];
  for (const [from, to] of hunks) {
    const slice = ops.slice(from, to + 1);
    const oldStart = slice.find((o) => o.oldNo)?.oldNo ?? (ops.slice(0, from).filter((o) => o.oldNo).pop()?.oldNo ?? 0);
    const newStart = slice.find((o) => o.newNo)?.newNo ?? (ops.slice(0, from).filter((o) => o.newNo).pop()?.newNo ?? 0);
    const oldCount = slice.filter((o) => o.kind !== "add").length;
    const newCount = slice.filter((o) => o.kind !== "del").length;
    out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`);
    for (const o of slice) out.push(`${o.kind === "add" ? "+" : o.kind === "del" ? "-" : " "}${o.text}`);
  }
  return out.join("\n");
}

/** A sticky note's colour from the file type: code mustard, styles pink, data cyan, docs green, anything else clay. */
export function noteTone(path: string): NoteTone {
  const name = path.split("/").pop() ?? "";
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (["ts", "tsx", "js", "jsx", "mjs", "cjs", "rs", "py", "go", "html", "vue", "svelte"].includes(ext)) return "mustard";
  if (["css", "scss", "sass", "less"].includes(ext)) return "pink";
  if (["json", "yml", "yaml", "toml", "env", "lock", "xml", "csv"].includes(ext)) return "cyan";
  if (["md", "mdx", "txt", "rst"].includes(ext)) return "green";
  return "clay";
}

export type StepState = { fileOpen: boolean; edits: number; branchChanged: boolean; pullRequest: boolean };

/**
 * Which step of Pick a file → Change it → Save to a branch → Ask the team you're on (1-4); 5 = all done (a pull request is
 * open). Unsaved edits always mean "save next"; a branch with saved changes and a clean desk means "ask the team".
 */
export function currentStep(s: StepState): number {
  if (s.edits > 0) return 3;
  if (s.pullRequest) return 5;
  if (s.branchChanged) return 4;
  if (s.fileOpen) return 2;
  return 1;
}

/** A stable number from text (FNV-1a), for colours and heights that don't change between visits. */
export function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const TEAM: TeamTone[] = ["pink", "cyan", "mustard", "green"];

/** A teammate's colour on the shelf, from their name (the same name always gets the same colour). */
export function authorTone(author: string): TeamTone {
  return TEAM[hashText(author.trim().toLowerCase()) % TEAM.length];
}

/** A spine's height in px. GitHub's commit list has no sizes, so it's decorative but stable: from the commit (q7:a). */
export function spineHeight(seed: string, min = 16, max = 46): number {
  return min + (hashText(seed) % (max - min + 1));
}

/** "2h ago" → "2h", "just now" → "now": the short time for drawer rows. */
export function shortAgo(ago: string): string {
  return ago === "just now" ? "now" : ago.replace(/ ago$/, "");
}
