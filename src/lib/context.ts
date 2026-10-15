// The team context workspace: a COCOMMIT/ folder in each repo, laid out like the
// /initiate-team CLAUDE/ workspace, so every teammate's AI agent starts from the same
// files. This module only turns text into data and back (pure functions); reading and
// committing the files goes through readFile / commitFiles in ./github.ts.

export const DIR = "COCOMMIT";

export const FILES = {
  context: `${DIR}/CONTEXT.md`,
  project: `${DIR}/PROJECT.md`,
  collab: `${DIR}/COLLAB.md`,
  handoff: `${DIR}/HANDOFF.md`,
  todo: `${DIR}/TODO.md`,
  log: `${DIR}/LOG.md`,
  decisions: `${DIR}/DECISIONS.md`,
  gotchas: `${DIR}/GOTCHAS.md`,
} as const;

export const BOARD = { pending: `${DIR}/BOARD/Pending`, taken: `${DIR}/BOARD/Taken`, done: `${DIR}/BOARD/Done` } as const;

// Same shape as FileEdit in ./github.ts, so the result of setup goes straight into commitFiles.
export type FileEdit = { path: string; content: string | null };

export type Member = {
  title: string; // also the agent-id; agents are "<Agent>-<Owner>", e.g. Claude-Pattadon
  name: string;
  role: string;
  capability: string;
  availability: string;
  writeScope: string;
};

export type SetupForm = {
  project: string;
  what: string;
  goals?: string;
  stack?: string;
  members: Member[];
  firstStep?: string;
  by: string;
  date: string; // YYYY-MM-DD
};

export type Handoff = { updated: string; by: string; state: string; next: string };
export type Activity = { kind: "commit" | "pr" | "pinned"; author: string; text: string; at: string };
export type Decision = { date: string; title: string; decision: string; why: string; alternatives?: string };
export type Gotcha = { date: string; title: string; whatFailed: string; evidence: string; workaround: string };
export type TodoItem = { text: string; done: boolean };

export const agentTitle = (agent: string, owner: string) => `${agent}-${owner}`;

// ---------- setup ----------

export const CLAUDE_POINTER = `@${FILES.context}`;
export const AGENTS_POINTER = `Read ${FILES.context} first: it is this team's shared context.`;

/** All files the "Set up team context" button commits. Pass the repo's current CLAUDE.md / AGENTS.md (or null). */
export function setupWorkspace(form: SetupForm, existing: { claudeMd: string | null; agentsMd: string | null }): FileEdit[] {
  const unknown = "unknown — ask";
  const files: FileEdit[] = [
    { path: FILES.context, content: contextFile(form.project) },
    {
      path: FILES.project,
      content: `# Project: ${form.project}\n\n## What & why\n${form.what.trim() || unknown}\n\n## Goals\n${form.goals?.trim() || unknown}\n\n## Stack\n${form.stack?.trim() || unknown}\n`,
    },
    { path: FILES.collab, content: form.members.reduce(upsertMember, COLLAB_HEAD) },
    {
      path: FILES.handoff,
      content: renderHandoff({
        updated: form.date,
        by: form.by,
        state: "Team context set up by CoCommit. Nothing else recorded yet.",
        next: form.firstStep?.trim() || "Fill in PROJECT.md goals, then add the first task to BOARD/Pending/.",
      }),
    },
    { path: FILES.todo, content: TODO_HEAD },
    { path: FILES.log, content: addLogEntry(LOG_HEAD, `${form.date} · ${form.by} — Set up team context with CoCommit`) },
    { path: FILES.decisions, content: DECISIONS_HEAD },
    { path: FILES.gotchas, content: GOTCHAS_HEAD },
    { path: `${DIR}/BOARD/_TEMPLATE.md`, content: TASK_TEMPLATE },
    ...Object.values(BOARD).map((dir) => ({ path: `${dir}/.gitkeep`, content: "" })),
    { path: "CLAUDE.md", content: withLine(existing.claudeMd, CLAUDE_POINTER) },
    { path: "AGENTS.md", content: withLine(existing.agentsMd, AGENTS_POINTER) },
  ];
  return files;
}

/** Puts the pointer line at the top of an instructions file, once. */
export function withLine(text: string | null, line: string): string {
  const body = text ?? "";
  if (body.includes(FILES.context)) return body;
  return body.trim() ? `${line}\n\n${body}` : `${line}\n`;
}

// ---------- HANDOFF.md ----------

export function parseHandoff(md: string): Handoff {
  const meta = md.match(/\*\*Last updated:\*\*\s*(.*?)\s*·\s*\*\*By:\*\*\s*(.*)/);
  return {
    updated: meta?.[1].trim() ?? "",
    by: meta?.[2].trim() ?? "",
    state: section(md, "Current state"),
    next: section(md, "Exact next step"),
  };
}

export function renderHandoff(h: Handoff): string {
  return `# Handoff\n\n<!-- Current state and the exact next step, so anyone can pick up cold. Rewritten, not appended. Keep it short. -->\n\n**Last updated:** ${h.updated} · **By:** ${h.by}\n\n## Current state\n${h.state.trim()}\n\n## Exact next step\n${h.next.trim()}\n`;
}

// ---------- LOG.md (newest on top) ----------

export function activityLine(a: Activity): string {
  const when = a.at.slice(0, 16).replace("T", " ");
  return `${when} · ${a.author} — ${a.kind}: ${oneLine(a.text)}`;
}

/** Adds one "- " line under the header, newest first; skips exact duplicates. */
export function addLogEntry(md: string, line: string): string {
  const entry = `- ${oneLine(line)}`;
  const { head, body } = splitHead(md);
  const lines = body.split("\n").filter((l) => l.trim());
  if (lines.includes(entry)) return md;
  return `${head}\n\n${[entry, ...lines].join("\n")}\n`;
}

/** Adds activity (commits, PRs, pinned chat) in time order, newest on top, keeping at most `limit` lines. */
export function addActivity(md: string, items: Activity[], limit = 100): string {
  const { head, body } = splitHead(md);
  const old = body.split("\n").filter((l) => l.startsWith("- "));
  const fresh = items.map((a) => `- ${activityLine(a)}`);
  const lines = [...new Set([...fresh, ...old])].sort((a, b) => timeKey(b).localeCompare(timeKey(a))).slice(0, limit);
  return `${head}\n\n${lines.join("\n")}\n`;
}

// "- 2026-10-15 14:05 · …" → "2026-10-15 14:05"; a line with only a date counts as 00:00.
const timeKey = (line: string) => {
  const m = line.match(/^- (\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))?/);
  return m ? `${m[1]} ${m[2] ?? "00:00"}` : "";
};

// ---------- DECISIONS.md / GOTCHAS.md (newest on top) ----------

export function addDecision(md: string, d: Decision): string {
  return addEntry(
    md,
    `## ${d.date} — ${oneLine(d.title)}\n- **Status:** active\n- **Decision:** ${oneLine(d.decision)}\n- **Why:** ${oneLine(d.why)}\n- **Alternatives:** ${oneLine(d.alternatives || "none recorded")}\n- **Supersedes / superseded by:** none`,
  );
}

export function addGotcha(md: string, g: Gotcha): string {
  return addEntry(
    md,
    `## ${g.date} — ${oneLine(g.title)}\n- **What failed:** ${oneLine(g.whatFailed)}\n- **Evidence:** ${oneLine(g.evidence)}\n- **Workaround:** ${oneLine(g.workaround)}`,
  );
}

/** Titles of the "## " entries, newest first, for list views. */
export function entryTitles(md: string): string[] {
  return md
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => l.slice(3).trim());
}

// ---------- TODO.md ----------

export function parseTodo(md: string): { backlog: TodoItem[]; questions: string[] } {
  const backlog = section(md, "Backlog")
    .split("\n")
    .map((l) => l.match(/^- \[( |x)\] (.*)$/i))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ done: m[1].toLowerCase() === "x", text: m[2].trim() }));
  const questions = section(md, "Open questions")
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
  return { backlog, questions };
}

export function renderTodo(todo: { backlog: TodoItem[]; questions: string[] }): string {
  const items = todo.backlog.map((t) => `- [${t.done ? "x" : " "}] ${oneLine(t.text)}`).join("\n");
  const qs = todo.questions.map((q) => `- ${oneLine(q)}`).join("\n");
  return `${TODO_HEAD.split("\n## Backlog")[0]}\n## Backlog\n${items}\n\n## Open questions\n${qs}\n`.replace(/\n{3,}/g, "\n\n");
}

// ---------- COLLAB.md ----------

export function parseCollab(md: string): Member[] {
  return md
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const [title, ...rest] = chunk.split("\n");
      const body = rest.join("\n");
      const field = (k: string) => body.match(new RegExp(`\\*\\*${k}:\\*\\*\\s*(.*)`))?.[1].trim() ?? "";
      return {
        title: title.trim(),
        name: field("Name"),
        role: field("Role"),
        capability: field("Capability"),
        availability: field("Availability"),
        writeScope: field("Write scope"),
      };
    });
}

/** Adds a member, or replaces the one with the same title (case-insensitive). */
export function upsertMember(md: string, m: Member): string {
  const others = parseCollab(md).filter((x) => x.title.toLowerCase() !== m.title.trim().toLowerCase());
  const { head } = splitHead(md);
  return `${head}\n\n${[...others, m].map(renderMember).join("\n\n")}\n`;
}

const renderMember = (m: Member) =>
  `## ${m.title.trim()}\n- **Name:** ${oneLine(m.name)}\n- **Role:** ${oneLine(m.role)}\n- **Capability:** ${oneLine(m.capability)}\n- **Availability:** ${oneLine(m.availability)}\n- **Write scope:** ${oneLine(m.writeScope)}`;

// ---------- helpers ----------

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

/** Text under a "## heading" up to the next "## ". */
function section(md: string, heading: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return "";
  const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
}

/** Splits a file into its header (title + <!-- note -->) and the entries below. */
function splitHead(md: string): { head: string; body: string } {
  const text = md.replace(/\r\n/g, "\n");
  const close = text.indexOf("-->");
  const firstEntry = text.search(/^(## |- )/m);
  const cut = close >= 0 && (firstEntry < 0 || close < firstEntry) ? close + 3 : firstEntry < 0 ? text.length : firstEntry;
  return { head: text.slice(0, cut).trimEnd(), body: text.slice(cut).trim() };
}

function addEntry(md: string, entry: string): string {
  const { head, body } = splitHead(md);
  return `${head}\n\n${entry}${body ? `\n\n${body}` : ""}\n`;
}

// ---------- templates ----------

const COLLAB_HEAD = `# Collab\n\n<!-- Who works here (people and agents): role, capability, availability, write scope. The title is the agent-id; agents are named <Agent>-<Owner>. Keep each entry to five lines. -->`;
const TODO_HEAD = `# Todo\n\n<!-- Backlog and open questions. When someone commits to an item, it becomes a task in BOARD/. -->\n\n## Backlog\n\n## Open questions\n`;
const LOG_HEAD = `# Log\n\n<!-- Meaningful events only, newest on top, one line each. CoCommit adds commits, merged PRs and pinned chat automatically. -->`;
const DECISIONS_HEAD = `# Decisions\n\n<!-- Newest on top. One entry per choice someone might later ask "why?" about. Never delete: mark old ones superseded. -->`;
const GOTCHAS_HEAD = `# Gotchas\n\n<!-- Failures worth not repeating, newest on top, each with evidence and a workaround. -->`;

const TASK_TEMPLATE = `# Task: {{title}}

**To:** {{a Title from COLLAB.md, or "anyone"}} · **From:** {{Title}} · **Created:** {{YYYY-MM-DD}}

## What
{{what needs doing}}

## Acceptance
- {{checkable outcome}}

## Taken
- **Owner:** — · **Progress:** — · **Blockers:** none

## Done
- **Verified by:** —
`;

function contextFile(project: string): string {
  return `# ${project}: team context

<!-- Set up by CoCommit. Every teammate's AI agent (Claude, Codex, ...) reads this first. -->

## Files (${DIR}/)
| File | Holds |
|------|-------|
| PROJECT.md | What and why, goals, stack |
| COLLAB.md | Who works here: people and their agents, roles, write scopes |
| HANDOFF.md | Current state and the exact next step |
| TODO.md | Backlog and open questions |
| LOG.md | Meaningful events, newest on top (CoCommit adds commits, PRs, pinned chat) |
| DECISIONS.md | Choices and why |
| GOTCHAS.md | Failures, evidence, workarounds |
| BOARD/ | Tasks: Pending/ (unclaimed) → Taken/ → Done/; the folder is the status |

## Who you are
Your title is \`<Agent>-<Owner>\`, e.g. \`Claude-Pattadon\`: the agent name plus the person whose machine you run on. If you aren't in COLLAB.md, add yourself before taking tasks. Only write inside your write scope.

## Work loop
1. **Before work:** read HANDOFF.md, run \`git status\`, and check BOARD/Pending/ for tasks addressed to you or "anyone".
2. **Claim:** move the task to BOARD/Taken/ and fill in Owner and Progress. Don't take tasks addressed to someone else, and don't open other people's tasks in Taken/.
3. **During work:** one line per meaningful event in LOG.md, failures in GOTCHAS.md, choices in DECISIONS.md, ideas in TODO.md.
4. **Finish:** move the task to BOARD/Done/ with how it was verified, or back to Pending/ with a handoff note.
5. **Always** rewrite HANDOFF.md (state + exact next step) before stopping.

## Rules
- Ask a human before commits, pushes, installs or deleting files, unless your owner said otherwise.
- Never put secrets or keys in these files.
`;
}
