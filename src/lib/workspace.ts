// Load and save a repo's COCOMMIT/ team workspace through GitHub, for "use client" screens.
// Text handling lives in ./context.ts (pure functions); this file only reads files, applies those
// functions and commits the result. Every commit message starts with "COCOMMIT:" so the log can skip them.
//
//   import { loadWorkspace, setUpWorkspace, saveHandoff, refreshLog } from "@/lib/workspace";
//   const ws = await loadWorkspace("GI-04/CoCommit");   // null until "Set up team context" was pressed
//
// Browser code must import GitHub calls from ./github-client, never ./github (see GOTCHAS).

import { listPinned } from "./chat";
import {
  addActivity,
  addDecision,
  addGotcha,
  entryTitles,
  FILES,
  parseCollab,
  parseHandoff,
  parseTodo,
  renderHandoff,
  renderTodo,
  setupWorkspace,
  upsertMember,
  type Activity,
  type Decision,
  type Gotcha,
  type Handoff,
  type Member,
  type SetupForm,
  type TodoItem,
} from "./context";
import { commitFiles, commitFilesQuietly, listCommits, listMergedPulls, listRepos, readFile } from "./github-client";
import type { Commit } from "./github-types";

export type FileKey = keyof typeof FILES;

export type Workspace = {
  repo: string;
  /** Raw text of each file; null if that file is missing. */
  files: Record<FileKey, string | null>;
  handoff: Handoff;
  collab: Member[];
  todo: { backlog: TodoItem[]; questions: string[] };
  decisions: string[]; // entry titles, newest first
  gotchas: string[];
  log: string[]; // "- …" lines, newest first
};

export const PREFIX = "COCOMMIT:";
const message = (text: string) => `${PREFIX} ${text.replace(/^COCOMMIT:\s*/i, "")}`;

/** The branch workspace commits go to: the repo's default branch ("main" if the repo isn't in your list). */
export async function workspaceBranch(repo: string): Promise<string> {
  const found = (await listRepos()).find((r) => r.fullName.toLowerCase() === repo.toLowerCase());
  return found?.defaultBranch ?? "main";
}

/** Reads every workspace file. Returns null when the repo has no COCOMMIT/CONTEXT.md yet (not set up). */
export async function loadWorkspace(repo: string): Promise<Workspace | null> {
  const keys = Object.keys(FILES) as FileKey[];
  const texts = await Promise.all(keys.map((k) => readFile(repo, null, FILES[k])));
  const files = Object.fromEntries(keys.map((k, i) => [k, texts[i]])) as Record<FileKey, string | null>;
  if (files.context === null) return null;
  return {
    repo,
    files,
    handoff: parseHandoff(files.handoff ?? ""),
    collab: parseCollab(files.collab ?? ""),
    todo: parseTodo(files.todo ?? ""),
    decisions: entryTitles(files.decisions ?? ""),
    gotchas: entryTitles(files.gotchas ?? ""),
    log: (files.log ?? "").split("\n").filter((l) => l.startsWith("- ")),
  };
}

/** The "Set up team context" button: commits the whole COCOMMIT/ folder plus the CLAUDE.md / AGENTS.md pointer lines. */
export async function setUpWorkspace(repo: string, form: SetupForm): Promise<Commit> {
  const [claudeMd, agentsMd, branch] = await Promise.all([
    readFile(repo, null, "CLAUDE.md"),
    readFile(repo, null, "AGENTS.md"),
    workspaceBranch(repo),
  ]);
  const files = setupWorkspace(form, { claudeMd, agentsMd });
  return commitFiles(repo, branch, files, message("set up team context"));
}

/** Commits new text for one or more workspace files in a single commit. */
export async function saveFiles(repo: string, edits: Partial<Record<FileKey, string>>, text: string): Promise<Commit> {
  const files = (Object.entries(edits) as [FileKey, string][]).map(([k, content]) => ({ path: FILES[k], content }));
  return commitFiles(repo, await workspaceBranch(repo), files, message(text));
}

/** Read one file, change it with `edit`, commit it. Skips the commit (returns null) if nothing changed. */
export async function updateFile(repo: string, key: FileKey, edit: (text: string) => string, text: string): Promise<Commit | null> {
  const before = (await readFile(repo, null, FILES[key])) ?? "";
  const after = edit(before);
  if (after === before) return null;
  return saveFiles(repo, { [key]: after }, text);
}

export const saveHandoff = (repo: string, h: Handoff) =>
  updateFile(repo, "handoff", () => renderHandoff(h), "update handoff");

export const addDecisionTo = (repo: string, d: Decision) =>
  updateFile(repo, "decisions", (md) => addDecision(md, d), `decision: ${d.title}`);

export const addGotchaTo = (repo: string, g: Gotcha) =>
  updateFile(repo, "gotchas", (md) => addGotcha(md, g), `gotcha: ${g.title}`);

export const saveMember = (repo: string, m: Member) =>
  updateFile(repo, "collab", (md) => upsertMember(md, m), `team: ${m.title}`);

export const saveTodo = (repo: string, todo: { backlog: TodoItem[]; questions: string[] }) =>
  updateFile(repo, "todo", () => renderTodo(todo), "update todo");

/** Everything that should appear in LOG.md: commits, merged PRs and pinned chat, minus CoCommit's own bookkeeping commits. */
export async function recentActivity(repo: string, limit = 10): Promise<Activity[]> {
  const [commits, pulls, pinned] = await Promise.all([
    listCommits(repo, limit),
    listMergedPulls(repo, limit),
    listPinned(repo, limit).catch(() => [] as Activity[]), // chat being down shouldn't stop the log
  ]);
  return [...commits.filter((a) => !a.text.startsWith(PREFIX)), ...pulls, ...pinned];
}

/**
 * Adds new activity to COCOMMIT/LOG.md and commits it quietly (no chat event).
 * Returns null when there was nothing new, so it's cheap to call on every visit to the Context screen.
 */
export async function refreshLog(repo: string): Promise<Commit | null> {
  const [items, before, branch] = await Promise.all([
    recentActivity(repo),
    readFile(repo, null, FILES.log),
    workspaceBranch(repo),
  ]);
  if (before === null) return null; // not set up yet
  const after = addActivity(before, items);
  if (after === before) return null;
  return commitFilesQuietly(repo, branch, [{ path: FILES.log, content: after }], message("update log"));
}
