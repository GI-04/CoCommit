// The Tasks board: reads and moves the task files in a repo's COCOMMIT/BOARD/ through GitHub, for "use client"
// screens (PLAN/2026-10-16-tasks-board.md). Text handling lives in ./tasks-text.ts; this file reads, edits and
// commits. Each move is one commit (new path written, old path deleted), so chat shows it as a git event.
// Needs GitHub login (401 otherwise) and a set-up workspace (COCOMMIT/CONTEXT.md).
//
//   import { loadBoard, takeTask } from "@/lib/tasks";
//   const board = await loadBoard(getCurrentRepo());
//
// Browser code must import GitHub calls from ./github-client, never ./github (see GOTCHAS).

import { NoWorkspaceError } from "./chat-pins";
import { addLogEntry, FILES, parseCollab, type Member } from "./context";
import { commitFiles, listFiles, readFile } from "./github-client";
import type { Commit, FileEdit, User } from "./github-types";
import { newTaskText, parseTask, taskFileName, taskLocation, taskPath, withDone, withHandoff, withTaken, type Task, type TaskStatus } from "./tasks-text";
import { PREFIX, workspaceBranch } from "./workspace";

export type { Task, TaskStatus } from "./tasks-text";

export type Board = { repo: string; branch: string; tasks: Task[]; members: Member[] };
export type NewTaskForm = { title: string; to: string; what: string; acceptance: string };
export type Saved = { task: Task; commit: Commit };

/** The task isn't where the board last saw it: someone else moved or removed it. */
export class TaskMovedError extends Error {
  constructor() {
    super("Someone already moved this task. Refresh the board.");
    this.name = "TaskMovedError";
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
// Local date and time (the team's own clock), as the board files write them.
const today = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = (d = new Date()) => `${today(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const message = (text: string) => `${PREFIX} ${text}`;

// Files this browser wrote in the last minute, by path. GitHub's contents API can answer with an older copy for a few
// seconds after a commit, so a second move right after the first uses the text we just wrote instead of reporting
// "already moved". After a minute, a missing file really means someone else moved it.
const written = new Map<string, { text: string; at: number }>();
const recent = (path: string) => {
  const w = written.get(path);
  return w && Date.now() - w.at < 60_000 ? w.text : null;
};
const remember = (path: string, text: string) => written.set(path, { text, at: Date.now() });

/** Everyone in COCOMMIT/COLLAB.md, then each task on the board, newest file first. */
export async function loadBoard(repo: string): Promise<Board> {
  const [context, branch] = await Promise.all([readFile(repo, null, FILES.context), workspaceBranch(repo)]);
  if (context === null) throw new NoWorkspaceError();
  const [paths, collab] = await Promise.all([listFiles(repo, branch), readFile(repo, branch, FILES.collab)]);
  const found = paths.map(taskLocation).filter((l) => l !== null);
  const texts = await Promise.all(found.map((l) => readFile(repo, branch, l.path)));
  const tasks = found
    .map((l, i) => (texts[i] === null ? null : parseTask(texts[i], l.path)))
    .filter((t) => t !== null)
    .sort((a, b) => b.file.localeCompare(a.file));
  return { repo, branch, tasks, members: parseCollab(collab ?? "") };
}

/** The COLLAB.md title that matches a GitHub user (title or name, any case), else "@login". */
export function whoAmI(members: Member[], user: User | null): string {
  if (!user) return "";
  const keys = [user.login, user.name ?? ""].map((k) => k.trim().toLowerCase()).filter(Boolean);
  const match = members.find((m) => keys.includes(m.title.toLowerCase()) || keys.includes(m.name.toLowerCase()));
  return match?.title ?? `@${user.login}`;
}

/** Writes COCOMMIT/BOARD/Pending/YYYY-MM-DD-<slug>.md as one commit. */
export async function createTask(board: Board, form: NewTaskForm, from: string): Promise<Saved> {
  const title = form.title.trim();
  if (!title) throw new Error("Give the task a title.");
  const d = new Date();
  const taken = board.tasks.map((t) => t.file);
  let file = taskFileName(today(d), title, taken, `${pad(d.getHours())}${pad(d.getMinutes())}`);
  // Someone may have added a task with the same name since the board loaded: never overwrite it.
  while ((await readFile(board.repo, board.branch, taskPath("pending", file))) !== null) {
    taken.push(file);
    file = taskFileName(today(d), title, taken, `${pad(d.getHours())}${pad(d.getMinutes())}`);
  }
  const path = taskPath("pending", file);
  const text = newTaskText({
    title,
    to: form.to,
    from,
    created: today(d),
    what: form.what,
    acceptance: form.acceptance.split("\n"),
  });
  const commit = await commitFiles(board.repo, board.branch, [{ path, content: text }], message(`new task: ${title}`));
  remember(path, text);
  return { task: parseTask(text, path), commit };
}

// Moves a task to another folder in one commit: reads its current text (so edits made since the board loaded are
// kept), applies `edit`, writes the new path and deletes the old one, plus any `extra` files.
async function move(board: Board, task: Task, to: TaskStatus, edit: (md: string) => string, verb: string, extra: (text: string) => Promise<FileEdit[]> = async () => []): Promise<Saved> {
  const current = (await readFile(board.repo, board.branch, task.path)) ?? recent(task.path);
  if (current === null) throw new TaskMovedError();
  const text = edit(current);
  const path = taskPath(to, task.file);
  const files: FileEdit[] = [{ path, content: text }, { path: task.path, content: null }, ...(await extra(text))];
  const commit = await commitFiles(board.repo, board.branch, files, message(`${verb}: ${task.title}`));
  written.delete(task.path);
  remember(path, text);
  return { task: parseTask(text, path), commit };
}

/** Pending → Taken: fills in Owner (and Progress, if given). */
export const takeTask = (board: Board, task: Task, owner: string, progress: string) =>
  move(board, task, "taken", (md) => withTaken(md, { owner: owner.trim() || "someone", progress, when: now() }), "task taken");

/** Taken → Done: fills in "Verified by" and adds a line to COCOMMIT/LOG.md in the same commit. */
export const finishTask = (board: Board, task: Task, verifiedBy: string, by: string) =>
  move(board, task, "done", (md) => withDone(md, { verifiedBy: verifiedBy.trim() || "not recorded", when: today() }), "task done", async () => {
    const log = await readFile(board.repo, board.branch, FILES.log);
    if (log === null) return [];
    const at = new Date().toISOString().slice(0, 16).replace("T", " "); // UTC, like the other LOG.md lines
    return [{ path: FILES.log, content: addLogEntry(log, `${at} · ${by || task.owner || "someone"} — task done: ${task.title}`) }];
  });

/** Taken → Pending: adds a handoff note so the next person can pick it up. */
export const releaseTask = (board: Board, task: Task, note: string, by: string) =>
  move(board, task, "pending", (md) => withHandoff(md, { note: note.trim() || "released, no note", by, when: now() }), "task released");
