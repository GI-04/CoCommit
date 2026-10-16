// Runs the @cocommit bot's tools against a repo branch. Server only: it uses the asker's GitHub sign-in through
// ./github.ts, so the bot can only read what that person can read. The branch is downloaded once as a tarball
// (./repo-snapshot.ts) and kept for 5 minutes; search and reads then run on that copy.
// Pure text handling is in ./bot.ts.

import {
  applyEdit,
  findEntries,
  formatChat,
  grepRepo,
  isEditToolName,
  isExcluded,
  lineDiff,
  listFolder,
  logSince,
  memberWork,
  numberLines,
  overview,
  toGithubLink,
  trimForSummary,
  MAX_CHANGED_FILES,
  MAX_EDIT_BYTES,
  WORKSPACE_DIR,
  type BotMode,
  type BotSource,
  type ChangeView,
  type ChatLine,
  type EditToolName,
  type ToolName,
  type WorkspaceFiles,
} from "./bot";
import { downloadTarball, getIssue, getLanguages, getPull, listBranches, listFileCommits, listIssues, listPulls, resolveBranch, type IssueState } from "./github";
import { parseTarball, type RepoFile } from "./repo-snapshot";

const CACHE_MS = 5 * 60_000;
const MAX_CACHED = 20;

export type Snapshot = { branch: string; files: RepoFile[]; byPath: Map<string, RepoFile>; loadedAt: number };

// Keyed by GitHub login + repo + branch, so one person's copy is never shown to someone else.
const cache = ((globalThis as { __cocommitRepoCache?: Map<string, Snapshot> }).__cocommitRepoCache ??= new Map());

/** Every file on `branch` (default branch when empty), cached for 5 minutes. */
export async function loadSnapshot(login: string, repo: string, branch: string | null): Promise<{ snap: Snapshot; cached: boolean }> {
  const resolved = await resolveBranch(repo, branch);
  const key = `${login}:${repo.toLowerCase()}:${resolved}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.loadedAt < CACHE_MS) return { snap: hit, cached: true };

  const files = parseTarball(await downloadTarball(repo, resolved)).sort((a, b) => a.path.localeCompare(b.path));
  const snap: Snapshot = { branch: resolved, files, byPath: new Map(files.map((f) => [f.path, f])), loadedAt: Date.now() };
  cache.set(key, snap);
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!); // oldest first
  return { snap, cached: false };
}

/** "./src/a.ts", "/src/a.ts" → "src/a.ts"; refuses "..". */
export function cleanPath(input: unknown): string | null {
  const raw = String(input ?? "").trim().replace(/^\.?\/+/, "").replace(/\/+$/, "");
  if (raw.split("/").some((p) => p === "..")) return null;
  return raw;
}

const str = (input: Record<string, unknown>, key: string) => (typeof input[key] === "string" ? (input[key] as string) : "");
const num = (input: Record<string, unknown>, key: string) => (typeof input[key] === "number" ? (input[key] as number) : Number(input[key]) || undefined);
const lines = (items: string[]) => items.join("\n") || "(nothing)";
const kb = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`);
const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}\n…(cut: ${text.length - max} more characters)` : text);

/** changes: staged edits (path → new text, null = deleted), only used in Edit mode. */
export type ToolContext = { repo: string; snap: Snapshot; chat: ChatLine[]; exclude: string[]; mode?: BotMode; changes?: Map<string, string | null> };
/** What a tool returns: text for Claude, plus what it read (shown as links under the answer). */
export type ToolOutput = { text: string; used: BotSource[] };

/** The repo as it would be with the staged changes. */
function current(ctx: ToolContext): RepoFile[] {
  if (!ctx.changes?.size) return ctx.snap.files;
  const out = ctx.snap.files.filter((f) => !ctx.changes!.has(f.path));
  for (const [path, content] of ctx.changes) if (content !== null) out.push({ path, size: Buffer.byteLength(content), text: content });
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** One file as it would be with the staged changes (undefined if missing or staged for deletion). */
function getFile(ctx: ToolContext, path: string): RepoFile | undefined {
  if (ctx.changes?.has(path)) {
    const content = ctx.changes.get(path)!;
    return content === null ? undefined : { path, size: Buffer.byteLength(content), text: content };
  }
  return ctx.snap.byPath.get(path);
}

/** The files the user hasn't excluded. */
const visible = (ctx: ToolContext) => {
  const files = current(ctx);
  return ctx.exclude.length ? files.filter((f) => !isExcluded(f.path, ctx.exclude)) : files;
};

/** The staged changes as the Assistant shows them (no-op changes left out). */
export function changeViews(ctx: ToolContext): ChangeView[] {
  const views: ChangeView[] = [];
  for (const [path, content] of ctx.changes ?? []) {
    const before = ctx.snap.byPath.get(path);
    if (content === null && !before) continue;
    if (content !== null && before?.text === content) continue;
    const diff = lineDiff(before?.text ?? null, content);
    views.push({ path, content, status: content === null ? "deleted" : before ? "modified" : "added", additions: diff.additions, deletions: diff.deletions, diff: diff.lines });
  }
  return views.sort((a, b) => a.path.localeCompare(b.path));
}

/** Why `path` can't be changed, or null if it can. */
function cannotChange(ctx: ToolContext, path: string | null, content: string | null): string | null {
  if (ctx.mode !== "edit" || !ctx.changes) return "Editing is off. Ask the user to switch the Assistant to Edit mode.";
  if (!path) return "Give a file path inside the repo.";
  if (path.length > 300) return "That path is too long.";
  if (isExcluded(path, ctx.exclude)) return `${path} is excluded by the user's "don't read" settings, so it can't be changed.`;
  if (current(ctx).some((f) => f.path.startsWith(`${path}/`))) return `${path} is a folder.`;
  const original = ctx.snap.byPath.get(path);
  if (content !== null && original && original.text === null && !ctx.changes.has(path)) return `${path} is a binary or very large file; it can't be edited as text.`;
  if (content !== null && Buffer.byteLength(content) > MAX_EDIT_BYTES) return `New content is over ${MAX_EDIT_BYTES / 1000} KB.`;
  if (!ctx.changes.has(path) && ctx.changes.size >= MAX_CHANGED_FILES) return `Already ${MAX_CHANGED_FILES} changed files; that's the limit for one pull request.`;
  return null;
}

function stage(ctx: ToolContext, path: string, content: string | null): ToolOutput {
  ctx.changes!.set(path, content);
  const view = changeViews(ctx).find((v) => v.path === path);
  const summary = view ? `${view.status} ${path} (+${view.additions} -${view.deletions})` : `${path}: no change from the original`;
  return { text: `Staged: ${summary}. Not committed; the user reviews it first.`, used: content === null ? [] : [fileLink(ctx, path)] };
}

/** COCOMMIT/ texts, for the team-notes tools. */
function workspace(ctx: ToolContext): WorkspaceFiles {
  const out: WorkspaceFiles = {};
  for (const f of visible(ctx)) if (f.path.startsWith(`${WORKSPACE_DIR}/`) && f.text !== null) out[f.path] = f.text;
  return out;
}

const fileLink = (ctx: ToolContext, path: string, from?: number, to?: number): BotSource => ({
  path: from ? `${path}:${from}${to && to !== from ? `-${to}` : ""}` : path,
  url: toGithubLink(ctx.repo, ctx.snap.branch, path, from, to),
});

function projectOverview(ctx: ToolContext, languages: [string, number][], prs: number, issues: number): ToolOutput {
  const files = visible(ctx);
  const root = files.filter((f) => !f.path.includes("/"));
  const readme = root.find((f) => /^readme(\.|$)/i.test(f.path));
  const manifests = root.filter((f) =>
    /^(package\.json|cargo\.toml|pyproject\.toml|requirements\.txt|go\.mod|pom\.xml|build\.gradle(\.kts)?|composer\.json|gemfile)$/i.test(f.path),
  );
  const folders = new Map<string, number>();
  for (const f of files) if (f.path.includes("/")) folders.set(f.path.split("/")[0], (folders.get(f.path.split("/")[0]) ?? 0) + 1);
  const notes = ["PROJECT.md", "HANDOFF.md"].map((n) => getFile(ctx, `${WORKSPACE_DIR}/${n}`)).filter((f): f is RepoFile => !!f && !isExcluded(f.path, ctx.exclude));
  const total = languages.reduce((s, [, b]) => s + b, 0) || 1;
  const used = [readme, ...manifests, ...notes].filter((f): f is RepoFile => !!f).map((f) => fileLink(ctx, f.path));
  return {
    text: [
      `Repo ${ctx.repo}, branch ${ctx.snap.branch}: ${files.length} files.`,
      `## Languages\n${languages.map(([l, b]) => `${l} ${((b / total) * 100).toFixed(1)}%`).join(", ") || "(unknown)"}`,
      `## Top level\n${[...folders].map(([d, n]) => `${d}/ (${n} files)`).join("\n")}\n${root.map((f) => `${f.path} (${kb(f.size)})`).join("\n")}`,
      `## Open pull requests: ${prs}${prs >= 100 ? "+" : ""} · open issues: ${issues}${issues >= 100 ? "+" : ""}`,
      readme?.text ? `## ${readme.path}\n${cut(readme.text, 6000)}` : "## README\n(none)",
      ...manifests.map((m) => `## ${m.path}\n${cut(m.text ?? "(binary)", 2500)}`),
      ...notes.map((n) => `## ${n.path}\n${cut(n.text ?? "", 3000)}`),
    ].join("\n\n"),
    used,
  };
}

export async function runTool(name: ToolName | EditToolName, input: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutput> {
  if (isEditToolName(name)) return runEditTool(name, input, ctx);
  switch (name) {
    case "get_project_overview": {
      const [languages, prs, issues] = await Promise.all([
        getLanguages(ctx.repo).catch(() => [] as [string, number][]),
        listPulls(ctx.repo, "open", 100).then((l) => l.length).catch(() => 0),
        listIssues(ctx.repo, "open", 100).then((l) => l.length).catch(() => 0),
      ]);
      return projectOverview(ctx, languages, prs, issues);
    }
    case "search_files": {
      const query = str(input, "query");
      const { names, hits, filesWithHits } = grepRepo(visible(ctx), query);
      const text = [
        `## File names matching "${query}"\n${lines(names)}`,
        `## Lines matching "${query}" (${hits.length}${filesWithHits ? ` shown, in ${filesWithHits} files` : ""})\n${lines(hits.map((h) => `${h.path}:${h.line}: ${h.text}`))}`,
      ].join("\n\n");
      // One link per file (first matching line); the route keeps only the ones the answer names.
      const firstHit = new Map<string, number>();
      for (const h of hits) if (!firstHit.has(h.path)) firstHit.set(h.path, h.line);
      return { text, used: [...firstHit].map(([path, line]) => fileLink(ctx, path, line)) };
    }
    case "read_file": {
      const path = cleanPath(input.path);
      if (!path) return { text: "Give a path inside the repo.", used: [] };
      if (isExcluded(path, ctx.exclude)) return { text: `${path} is excluded by the user's "don't read" settings.`, used: [] };
      const file = getFile(ctx, path);
      if (!file) {
        const similar = grepRepo(visible(ctx), path.split("/").pop() ?? path).names.slice(0, 5);
        return { text: `No such file on ${ctx.snap.branch}: ${path}.${similar.length ? ` Did you mean: ${similar.join(", ")}?` : " Use search_files or list_folder."}`, used: [] };
      }
      if (file.text === null) return { text: `${path} is a binary or very large file (${kb(file.size)}); its contents can't be read as text.`, used: [fileLink(ctx, path)] };
      const page = numberLines(file.text, num(input, "from_line"), num(input, "to_line"));
      const more = page.to < page.total ? `\n…(lines ${page.to + 1}-${page.total} not shown; read again with from_line=${page.to + 1})` : "";
      return { text: `${path} (lines ${page.from}-${page.to} of ${page.total})\n${page.text}${more}`, used: [fileLink(ctx, path, page.from === 1 && page.to === page.total ? undefined : page.from, page.to)] };
    }
    case "list_folder": {
      const path = cleanPath(input.path ?? "") ?? "";
      if (path && isExcluded(path, ctx.exclude)) return { text: `${path}/ is excluded by the user's "don't read" settings.`, used: [] };
      const files = visible(ctx);
      const entries = listFolder(files.map((f) => f.path), path);
      const prefix = path ? `${path}/` : "";
      const described = entries.map((e) => {
        if (e.endsWith("/")) return `${e} (${files.filter((f) => f.path.startsWith(prefix + e)).length} files)`;
        const f = getFile(ctx, prefix + e);
        return `${e} (${kb(f?.size ?? 0)}${f && f.text === null ? ", binary" : ""})`;
      });
      return { text: entries.length ? described.join("\n") : `No folder "${path}" on ${ctx.snap.branch}.`, used: [] };
    }
    case "get_file_history": {
      const path = cleanPath(input.path ?? "") ?? "";
      if (path && isExcluded(path, ctx.exclude)) return { text: `${path} is excluded by the user's "don't read" settings.`, used: [] };
      const commits = await listFileCommits(ctx.repo, path, 15, undefined, ctx.snap.branch);
      return { text: lines(commits.map((c) => `${c.at.slice(0, 16)} ${c.author}: ${c.text}`)), used: path && getFile(ctx, path) ? [fileLink(ctx, path)] : [] };
    }
    case "list_branches":
      return { text: lines(await listBranches(ctx.repo)), used: [] };
    case "list_pull_requests": {
      const prs = await listPulls(ctx.repo, str(input, "state") as IssueState, 30);
      return {
        text: lines(prs.map((p) => `#${p.number} ${p.title} · ${p.author} · ${p.head} → ${p.base} · ${p.merged ? "merged" : p.state} · ${p.updatedAt.slice(0, 10)}`)),
        used: [],
      };
    }
    case "read_pull_request": {
      const pr = await getPull(ctx.repo, num(input, "number") ?? 0);
      let diffRoom = 20_000;
      const files = pr.files.map((f) => {
        const hidden = isExcluded(f.path, ctx.exclude);
        const patch = hidden ? "(excluded by settings)" : f.patch ? (diffRoom > 0 ? cut(f.patch, Math.max(0, Math.min(diffRoom, 4000))) : "(diff not shown: too long)") : "(no text diff)";
        if (!hidden && f.patch) diffRoom -= Math.min(f.patch.length, 4000);
        return `### ${f.path} (${f.status}, +${f.additions} -${f.deletions})\n${patch}`;
      });
      return {
        text: [
          `#${pr.number} ${pr.title}\n${pr.author} · ${pr.head} → ${pr.base} · ${pr.merged ? "merged" : pr.state} · updated ${pr.updatedAt.slice(0, 10)}`,
          `## Description\n${cut(pr.body || "(none)", 4000)}`,
          `## Files (${pr.files.length})\n${files.join("\n\n")}`,
          `## Comments (${pr.comments.length})\n${lines(pr.comments.map((c) => `${c.at.slice(0, 16)} ${c.author}${c.path ? ` on ${c.path}${c.line ? `:${c.line}` : ""}` : ""}: ${cut(c.body, 800)}`))}`,
        ].join("\n\n"),
        used: [{ path: `PR #${pr.number}`, url: pr.url }],
      };
    }
    case "list_issues": {
      const issues = await listIssues(ctx.repo, str(input, "state") as IssueState, 30);
      return {
        text: lines(issues.map((i) => `#${i.number} ${i.title} · ${i.author} · ${i.state}${i.labels.length ? ` · [${i.labels.join(", ")}]` : ""} · ${i.commentCount} comments · ${i.updatedAt.slice(0, 10)}`)),
        used: [],
      };
    }
    case "read_issue": {
      const issue = await getIssue(ctx.repo, num(input, "number") ?? 0);
      return {
        text: [
          `#${issue.number} ${issue.title}\n${issue.author} · ${issue.state}${issue.labels.length ? ` · [${issue.labels.join(", ")}]` : ""}`,
          `## Body\n${cut(issue.body || "(none)", 6000)}`,
          `## Comments (${issue.comments.length})\n${lines(issue.comments.map((c) => `${c.at.slice(0, 16)} ${c.author}: ${cut(c.body, 1500)}`))}`,
        ].join("\n\n"),
        used: [{ path: `Issue #${issue.number}`, url: issue.url }],
      };
    }
    case "find_entry": {
      const found = findEntries(workspace(ctx), str(input, "keyword"));
      return { text: lines(found.map((f) => `${f.path}: ${f.line}`)), used: [...new Set(found.map((f) => f.path))].map((p) => fileLink(ctx, p)) };
    }
    case "get_overview": {
      const files = workspace(ctx);
      const used = ["HANDOFF.md", "TODO.md", "LOG.md"].map((f) => `${WORKSPACE_DIR}/${f}`).filter((p) => p in files);
      return { text: overview(files), used: used.map((p) => fileLink(ctx, p)) };
    }
    case "get_changes_since": {
      const since = str(input, "date").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) return { text: "Give the date as YYYY-MM-DD.", used: [] };
      const log = `${WORKSPACE_DIR}/LOG.md`;
      const files = workspace(ctx);
      const commits = await listFileCommits(ctx.repo, "", 40, since, ctx.snap.branch);
      return {
        text: `## LOG.md since ${since}\n${lines(logSince(files[log] ?? "", since))}\n\n## Commits on ${ctx.snap.branch} since ${since}\n${lines(
          commits.map((c) => `${c.at.slice(0, 16)} ${c.author}: ${c.text}`),
        )}`,
        used: log in files ? [fileLink(ctx, log)] : [],
      };
    }
    case "get_member_work": {
      const files = workspace(ctx);
      const collab = `${WORKSPACE_DIR}/COLLAB.md`;
      return { text: trimForSummary(memberWork(files, str(input, "name"))), used: collab in files ? [fileLink(ctx, collab)] : [] };
    }
    case "get_chat_messages":
      return { text: formatChat(ctx.chat, str(input, "since") || undefined), used: [] };
  }
}

function runEditTool(name: EditToolName, input: Record<string, unknown>, ctx: ToolContext): ToolOutput {
  if (name === "show_changes") {
    if (ctx.mode !== "edit") return { text: "Editing is off.", used: [] };
    const views = changeViews(ctx);
    if (!views.length) return { text: "No staged changes yet.", used: [] };
    return {
      text: views
        .map((v) => `### ${v.path} (${v.status}, +${v.additions} -${v.deletions})\n${v.diff.map((l) => (l.kind === "…" ? "…" : `${l.kind} ${l.text}`)).join("\n")}`)
        .join("\n\n")
        .slice(0, 30_000),
      used: [],
    };
  }
  const path = cleanPath(input.path);
  if (name === "delete_file") {
    const why = cannotChange(ctx, path, null);
    if (why) return { text: why, used: [] };
    if (!getFile(ctx, path!)) return { text: `No such file: ${path}.`, used: [] };
    return stage(ctx, path!, null);
  }
  const existing = path ? getFile(ctx, path) : undefined;
  if (name === "write_file") {
    const content = str(input, "content");
    const why = cannotChange(ctx, path, content);
    if (why) return { text: why, used: [] };
    return stage(ctx, path!, content);
  }
  // edit_file
  const why = cannotChange(ctx, path, "");
  if (why) return { text: why, used: [] };
  if (!existing) return { text: `No such file: ${path}. Use write_file to create it.`, used: [] };
  if (existing.text === null) return { text: `${path} is a binary or very large file; it can't be edited as text.`, used: [] };
  const result = applyEdit(existing.text, str(input, "old_text"), str(input, "new_text"));
  if ("error" in result) return { text: `${path}: ${result.error}`, used: [] };
  const sizeWhy = cannotChange(ctx, path, result.text);
  if (sizeWhy) return { text: sizeWhy, used: [] };
  return stage(ctx, path!, result.text);
}
