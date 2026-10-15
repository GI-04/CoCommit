// Runs the @cocommit bot's tools against a repo's COCOMMIT/ folder. Server only: it uses the asker's
// GitHub sign-in through ./github.ts, so the bot can only read what that person can read.
// Pure text handling is in ./bot.ts.

import {
  findEntries,
  formatChat,
  listFolder,
  logSince,
  memberWork,
  overview,
  searchFiles,
  trimForSummary,
  WORKSPACE_DIR,
  type ChatLine,
  type ToolName,
  type WorkspaceFiles,
} from "./bot";
import { listFileCommits, listFolderFiles, readFile } from "./github";

const CACHE_MS = 5 * 60_000;
const MAX_FILES = 80;

export type Snapshot = { branch: string; files: WorkspaceFiles };

// Keyed by GitHub login + repo, so one person's cached copy is never shown to someone else.
const cache = ((globalThis as { __cocommitBotCache?: Map<string, { at: number; snap: Snapshot }> }).__cocommitBotCache ??= new Map());

/** Every text file under COCOMMIT/ on the default branch (cached for 5 minutes). Null if the folder doesn't exist. */
export async function loadSnapshot(login: string, repo: string): Promise<Snapshot | null> {
  const key = `${login}:${repo.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.snap;

  const { branch, paths } = await listFolderFiles(repo, WORKSPACE_DIR);
  if (paths.length === 0) return null;
  const wanted = paths.filter((p) => /\.(md|txt|json|ya?ml)$/i.test(p)).slice(0, MAX_FILES);
  const texts = await Promise.all(wanted.map((p) => readFile(repo, branch, p)));
  const files: WorkspaceFiles = {};
  wanted.forEach((p, i) => {
    if (texts[i] !== null) files[p] = texts[i];
  });
  const snap = { branch, files };
  cache.set(key, { at: Date.now(), snap });
  return snap;
}

/** Accepts "DECISIONS.md", "COCOMMIT/DECISIONS.md" or "/COCOMMIT/BOARD/"; refuses anything outside COCOMMIT/. */
export function workspacePath(input: unknown): string | null {
  const raw = String(input ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (!raw || raw.split("/").some((p) => p === "." || p === "..")) return null;
  return raw === WORKSPACE_DIR || raw.startsWith(`${WORKSPACE_DIR}/`) ? raw : `${WORKSPACE_DIR}/${raw}`;
}

const str = (input: Record<string, unknown>, key: string) => (typeof input[key] === "string" ? (input[key] as string) : "");
const lines = (items: string[]) => items.join("\n") || "(nothing)";

export type ToolContext = { repo: string; snap: Snapshot; chat: ChatLine[] };
/** What a tool returns: text for Claude, plus the files it used (shown as links under the answer). */
export type ToolOutput = { text: string; used: string[] };

export async function runTool(name: ToolName, input: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutput> {
  const { files } = ctx.snap;
  switch (name) {
    case "search_files": {
      const hits = searchFiles(files, str(input, "query"));
      return { text: lines(hits.map((h) => `${h.path} (score ${h.score}): ${h.snippet}`)), used: [] };
    }
    case "read_file": {
      const path = workspacePath(input.path);
      const text = path ? files[path] : undefined;
      if (text === undefined) return { text: `No such file: ${String(input.path)}. Use search_files or list_folder.`, used: [] };
      return { text: trimForSummary(text), used: [path!] };
    }
    case "list_folder": {
      const path = workspacePath(input.path) ?? WORKSPACE_DIR;
      return { text: lines(listFolder(Object.keys(files), path)), used: [] };
    }
    case "get_file_history": {
      const path = workspacePath(input.path);
      if (!path) return { text: "Give a path inside COCOMMIT/.", used: [] };
      const commits = await listFileCommits(ctx.repo, path, 10);
      return { text: lines(commits.map((c) => `${c.at.slice(0, 16)} ${c.author}: ${c.text}`)), used: [path] };
    }
    case "find_entry": {
      const found = findEntries(files, str(input, "keyword"));
      return { text: lines(found.map((f) => `${f.path}: ${f.line}`)), used: [...new Set(found.map((f) => f.path))] };
    }
    case "get_overview": {
      const used = ["HANDOFF.md", "TODO.md", "LOG.md"].map((f) => `${WORKSPACE_DIR}/${f}`).filter((p) => p in files);
      return { text: overview(files), used };
    }
    case "get_changes_since": {
      const since = str(input, "date").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) return { text: "Give the date as YYYY-MM-DD.", used: [] };
      const log = `${WORKSPACE_DIR}/LOG.md`;
      const commits = await listFileCommits(ctx.repo, WORKSPACE_DIR, 30, since);
      return {
        text: `## LOG.md since ${since}\n${lines(logSince(files[log] ?? "", since))}\n\n## Commits to ${WORKSPACE_DIR}/ since ${since}\n${lines(
          commits.map((c) => `${c.at.slice(0, 16)} ${c.author}: ${c.text}`),
        )}`,
        used: log in files ? [log] : [],
      };
    }
    case "get_member_work": {
      const collab = `${WORKSPACE_DIR}/COLLAB.md`;
      return { text: memberWork(files, str(input, "name")), used: collab in files ? [collab] : [] };
    }
    case "get_chat_messages":
      return { text: formatChat(ctx.chat, str(input, "since") || undefined), used: [] };
  }
}
