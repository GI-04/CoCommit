// Task files on a repo's COCOMMIT/BOARD/ board (PLAN/2026-10-16-tasks-board.md): read them for the Tasks screen and
// make the small edits a move needs. Pure text in/out with no imports, so tests can load it directly; ./tasks.ts
// does the reading and committing. The folder is the status: Pending/ → Taken/ → Done/.
//
// Agents write these files by hand too (extra "**Under:**" or "**Status:**" lines and so on), so every edit here
// changes only its own lines and keeps the rest of the file as it was.

/** Same folder as BOARD in ./context.ts (repeated so this file needs no imports). */
export const BOARD_DIR = "COCOMMIT/BOARD";

export type TaskStatus = "pending" | "taken" | "done";
export const STATUSES: TaskStatus[] = ["pending", "taken", "done"];
export const FOLDER: Record<TaskStatus, string> = { pending: "Pending", taken: "Taken", done: "Done" };

export type Task = {
  path: string; // COCOMMIT/BOARD/<Folder>/<file>
  file: string; // YYYY-MM-DD-<slug>.md
  status: TaskStatus;
  title: string;
  to: string;
  from: string;
  created: string;
  what: string;
  acceptance: string[];
  owner: string;
  progress: string;
  blockers: string;
  verifiedBy: string;
  handoff: string;
  text: string; // the whole file
};

export type NewTask = { title: string; to: string; from: string; created: string; what: string; acceptance: string[] };

/** Where a path sits on the board, or null for anything that isn't a task file (_TEMPLATE.md, .gitkeep, subfolders). */
export function taskLocation(path: string): { path: string; status: TaskStatus; file: string } | null {
  const m = path.match(/^COCOMMIT\/BOARD\/(Pending|Taken|Done)\/([^/]+\.md)$/);
  if (!m || m[2].startsWith("_") || m[2].startsWith(".")) return null;
  const status = STATUSES.find((s) => FOLDER[s] === m[1])!;
  return { path, status, file: m[2] };
}

export const taskPath = (status: TaskStatus, file: string) => `${BOARD_DIR}/${FOLDER[status]}/${file}`;

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const noComments = (s: string) => s.replace(/<!--[\s\S]*?-->/g, "");
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// "—", "-" and template placeholders ("{{…}}") count as empty.
const clean = (s: string) => {
  const v = oneLine(noComments(s));
  return v === "—" || v === "-" || /^\{\{.*\}\}$/.test(v) ? "" : v;
};

// A "**Name:** value" field. The value ends at the next " · **Other:**" on the same line, a comment, or the line end.
const fieldPattern = (name: string) =>
  new RegExp(`(\\*\\*${escape(name)}:\\*\\*)[ \\t]*(.*?)(?=[ \\t]+·[ \\t]+\\*\\*|[ \\t]*<!--|[ \\t]*$)`, "m");

function field(md: string, name: string): string {
  return clean(md.match(fieldPattern(name))?.[2] ?? "");
}

// A "## Name" section: where its heading starts, and where its body starts and ends
// (the heading may carry a comment, e.g. "## Taken <!-- … -->").
function sectionRange(md: string, name: string): { heading: number; start: number; end: number } | null {
  const found = new RegExp(`^##[ \\t]+${escape(name)}\\b[^\\n]*(\\n|$)`, "m").exec(md);
  if (!found) return null;
  const start = found.index + found[0].length;
  const next = /^##?[ \t]/m.exec(md.slice(start));
  return { heading: found.index, start, end: next ? start + next.index : md.length };
}

const isPlaceholder = (line: string) => /^\s*-?\s*\{\{.*\}\}\s*$/.test(line);

function section(md: string, name: string): string {
  const r = sectionRange(md, name);
  if (!r) return "";
  return noComments(md.slice(r.start, r.end))
    .split("\n")
    .filter((l) => !isPlaceholder(l))
    .join("\n")
    .trim();
}

export function parseTask(md: string, path: string): Task {
  const at = taskLocation(path);
  const file = at?.file ?? path.split("/").pop() ?? path;
  const heading = md.match(/^#[ \t]+Task:[ \t]*(.*)$/m) ?? md.match(/^#[ \t]+(.+)$/m);
  const title = clean(heading?.[1] ?? "") || file.replace(/\.md$/, "");
  const what = section(md, "What");
  return {
    path,
    file,
    status: at?.status ?? "pending",
    title,
    to: field(md, "To"),
    from: field(md, "From"),
    created: field(md, "Created") || file.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "",
    what: what === "—" ? "" : what,
    acceptance: section(md, "Acceptance")
      .split("\n")
      .map((l) => l.match(/^\s*[-*][ \t]+(?:\[[ xX]\][ \t]+)?(.*)$/)?.[1].trim() ?? "")
      .filter((l) => l && l !== "—"),
    owner: field(md, "Owner"),
    progress: field(md, "Progress"),
    blockers: field(md, "Blockers"),
    verifiedBy: field(md, "Verified by"),
    handoff: section(md, "Handoff"),
    text: md,
  };
}

/** A new task file in the same shape as COCOMMIT/BOARD/_TEMPLATE.md. */
export function newTaskText(t: NewTask): string {
  const acceptance = t.acceptance.map(oneLine).filter(Boolean);
  return `# Task: ${oneLine(t.title)}

**To:** ${oneLine(t.to) || "anyone"} · **From:** ${oneLine(t.from) || "—"} · **Created:** ${t.created}

## What
${t.what.trim() || "—"}

## Acceptance
${acceptance.length ? acceptance.map((a) => `- ${a}`).join("\n") : "- —"}

## Taken
- **Owner:** — · **Progress:** — · **Blockers:** none

## Done
- **Verified by:** —
`;
}

// Adds a line at the end of a section's body; a template placeholder line ("{{…}}") there gives way to it.
// A missing section is created before "## Done" (or at the end of the file).
function addToSection(md: string, name: string, line: string): string {
  const r = sectionRange(md, name);
  if (!r) {
    const done = name === "Done" ? null : sectionRange(md, "Done");
    if (done) return `${md.slice(0, done.heading)}## ${name}\n${line}\n\n${md.slice(done.heading)}`;
    return `${md.replace(/\s+$/, "")}\n\n## ${name}\n${line}\n`;
  }
  const kept = md
    .slice(r.start, r.end)
    .replace(/\s+$/, "")
    .split("\n")
    .filter((l) => !isPlaceholder(l))
    .join("\n");
  const body = kept.trim() ? `${kept}\n${line}` : line;
  return `${md.slice(0, r.start)}${body}${r.end < md.length ? "\n\n" : "\n"}${md.slice(r.end)}`;
}

/** Sets "**Name:** value" where it is; if the file has no such field, adds "- **Name:** value" to `sectionName`. */
export function setField(md: string, name: string, value: string, sectionName: string): string {
  const v = oneLine(value) || "—";
  const p = fieldPattern(name);
  if (p.test(md)) return md.replace(p, (_all, label: string) => `${label} ${v}`);
  return addToSection(md, sectionName, `- **${name}:** ${v}`);
}

const hasField = (md: string, name: string) => fieldPattern(name).test(md);

/** Pending → Taken: who has it, and where it stands. "Taken on" is filled only where the file has that field. */
export function withTaken(md: string, t: { owner: string; progress?: string; when: string }): string {
  let out = setField(md, "Owner", t.owner, "Taken");
  if (t.progress?.trim()) out = setField(out, "Progress", t.progress, "Taken");
  if (hasField(out, "Taken on")) out = setField(out, "Taken on", t.when, "Taken");
  return out;
}

/** Taken → Done: how it was checked. "Done on" is filled only where the file has that field. */
export function withDone(md: string, t: { verifiedBy: string; when: string }): string {
  let out = setField(md, "Verified by", t.verifiedBy, "Done");
  if (hasField(out, "Done on")) out = setField(out, "Done on", t.when, "Done");
  return out;
}

/** Taken → Pending: adds a handoff note (what's done, what's left) under "## Handoff". */
export function withHandoff(md: string, t: { note: string; by: string; when: string }): string {
  return addToSection(md, "Handoff", `- ${t.when} · ${oneLine(t.by) || "someone"}: ${oneLine(t.note)}`);
}

/**
 * "YYYY-MM-DD-<slug>.md" from the title, unique among `taken` (file names, any case).
 * A title without ASCII letters or digits (Thai, for one) gets "task-<HHMM>"; clashes get "-2", "-3", …
 */
export function taskFileName(date: string, title: string, taken: string[], hhmm: string): string {
  const slug =
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50)
      .replace(/-+$/, "") || `task-${hhmm}`;
  const used = new Set(taken.map((f) => f.toLowerCase()));
  const base = `${date}-${slug}`;
  for (let n = 1; ; n++) {
    const name = n === 1 ? `${base}.md` : `${base}-${n}.md`;
    if (!used.has(name)) return name;
  }
}
