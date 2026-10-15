// GitHub sign-in and the git buttons, through the GitHub REST API.
// Server only: it reads the sign-in cookie. Browser code uses github-client.ts.
// While GITHUB_CLIENT_ID is empty, every function returns fake data (see "Fake mode").
// GITHUB_API_URL / GITHUB_WEB_URL can point at GitHub Enterprise or a local fake GitHub for tests.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Activity } from "./context";
import { hasGitHubIdentity } from "./login-identity";
import { getSupabaseServer } from "./supabase-server";
import type { Change, Commit, FileEdit, GitHubActions, PullRequest, Repo, Session, User } from "./github-types";

export type { Change, Commit, FileEdit, PullRequest, Repo, Session, User } from "./github-types";

const API = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
const WEB = (process.env.GITHUB_WEB_URL || "https://github.com").replace(/\/$/, "");
const CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? "";

const CONTEXT_PATH = "COCOMMIT.md";
const TOKEN_COOKIE = "cc_github";
const STATE_COOKIE = "cc_github_state";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const fakeMode = !CLIENT_ID;
if (fakeMode) console.warn("[github] GITHUB_CLIENT_ID is empty, so GitHub calls return fake data.");

export class GitHubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

// ---------- Sign-in (used by the /api/github/login, callback and logout routes)

/** Where to send the browser to sign in. Remembers a one-time `state` and the page to come back to. */
export async function signInUrl(origin: string, returnTo: string | null): Promise<string> {
  const back = safeReturnTo(returnTo);
  if (fakeMode) return new URL(back, origin).toString();

  const state = randomBytes(16).toString("base64url");
  const saved = Buffer.from(JSON.stringify({ state, returnTo: back })).toString("base64url");
  (await cookies()).set(STATE_COOKIE, saved, { ...cookieOptions, maxAge: 10 * 60 });

  const url = new URL(`${WEB}/login/oauth/authorize`);
  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${origin}/api/github/callback`,
    scope: "repo read:user",
    state,
  }).toString();
  return url.toString();
}

/** Trades GitHub's one-time `code` for a token, stores it encrypted in a cookie, and returns the page to go back to. */
export async function finishSignIn(origin: string, code: string | null, state: string | null): Promise<string> {
  const jar = await cookies();
  const saved = readState(jar.get(STATE_COOKIE)?.value);
  jar.delete(STATE_COOKIE);
  if (!code || !state || !saved || saved.state !== state) {
    throw new GitHubError(400, "This sign-in link expired or was started in another tab. Try again.");
  }

  const res = await fetch(`${WEB}/login/oauth/access_token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "CoCommit" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: `${origin}/api/github/callback`,
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!data.access_token) throw new GitHubError(401, data.error_description ?? "GitHub didn't return a token.");

  jar.set(TOKEN_COOKIE, seal(data.access_token), { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 });
  return saved.returnTo;
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(TOKEN_COOKIE);
}

/**
 * Keeps GitHub's token from a Supabase GitHub sign-in (/auth/callback), sealed in the same cookie the
 * legacy sign-in uses, so every git function below works unchanged.
 */
export async function saveGitHubToken(accessToken: string): Promise<void> {
  (await cookies()).set(TOKEN_COOKIE, seal(accessToken), { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 });
}

function safeReturnTo(path: string | null | undefined): string {
  return path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : "/repo";
}

function readState(value: string | undefined): { state: string; returnTo: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return typeof parsed.state === "string" ? { state: parsed.state, returnTo: safeReturnTo(parsed.returnTo) } : null;
  } catch {
    return null;
  }
}

// The token cookie is encrypted (AES-256-GCM), so the browser only ever holds ciphertext.
function cookieKey(): Buffer {
  return createHash("sha256").update(`cocommit-github-cookie:${CLIENT_SECRET}`).digest();
}

function seal(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cookieKey(), iv);
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

function unseal(sealed: string): string | null {
  try {
    const raw = Buffer.from(sealed, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", cookieKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ---------- Talking to GitHub

async function token(): Promise<string> {
  const sealed = (await cookies()).get(TOKEN_COOKIE)?.value;
  const value = sealed ? unseal(sealed) : null;
  if (!value) throw new GitHubError(401, "Not signed in to GitHub.");
  return value;
}

async function gh<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${await token()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "CoCommit",
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string; errors?: { message?: string }[] } | null;
    throw new GitHubError(res.status, data?.errors?.[0]?.message ?? data?.message ?? res.statusText);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

function repoPath(repo: string): string {
  const parts = typeof repo === "string" ? repo.split("/") : [];
  if (parts.length !== 2 || parts.some((p) => !/^[\w.-]+$/.test(p) || p === "." || p === "..")) {
    throw new GitHubError(400, `Not a repo name (expected "owner/name"): ${repo}`);
  }
  return `/repos/${repo}`;
}

/** Encodes a branch name or file path for a URL, keeping its slashes. */
function seg(value: string): string {
  const parts = String(value).split("/");
  if (parts.some((p) => p === "" || p === "." || p === "..")) throw new GitHubError(400, `Not a valid name: ${value}`);
  return parts.map(encodeURIComponent).join("/");
}

async function defaultBranch(repo: string): Promise<string> {
  return (await gh<{ default_branch: string }>(repoPath(repo))).default_branch;
}

async function branchSha(repo: string, branch: string): Promise<string> {
  return (await gh<{ object: { sha: string } }>(`${repoPath(repo)}/git/ref/heads/${seg(branch)}`)).object.sha;
}

const is404 = (e: unknown) => e instanceof GitHubError && e.status === 404;

// ---------- The git buttons

export async function getSession(): Promise<Session> {
  if (fakeMode) return { user: fake.user, fake: true };
  try {
    const u = await gh<{ login: string; name: string | null; avatar_url: string }>("/user");
    return { user: { login: u.login, name: u.name, avatarUrl: u.avatar_url }, fake: false };
  } catch (e) {
    if (e instanceof GitHubError && e.status === 401) return { user: null, fake: false, needsReconnect: await signedInWithGitHub() };
    throw e;
  }
}

/** A Supabase user who signed in with GitHub but has no usable GitHub token (cookie gone, expired or revoked). */
async function signedInWithGitHub(): Promise<boolean> {
  try {
    const supabase = await getSupabaseServer();
    if (!supabase) return false;
    const { data } = await supabase.auth.getUser();
    return Boolean(data.user && !data.user.is_anonymous && hasGitHubIdentity(data.user));
  } catch {
    return false;
  }
}

/** The signed-in user's repos, most recently updated first (up to 100). */
export async function listRepos(): Promise<Repo[]> {
  if (fakeMode) return fake.repos;
  const data = await gh<{ full_name: string; default_branch: string; private: boolean; updated_at: string }[]>(
    "/user/repos?sort=updated&per_page=100",
  );
  return data.map((r) => ({ fullName: r.full_name, defaultBranch: r.default_branch, private: r.private, updatedAt: r.updated_at }));
}

export async function listBranches(repo: string): Promise<string[]> {
  if (fakeMode) return fake.branches;
  const data = await gh<{ name: string }[]>(`${repoPath(repo)}/branches?per_page=100`);
  return data.map((b) => b.name);
}

/** What `branch` changed compared with the repo's default branch: what its pull request would contain. */
export async function getChanges(repo: string, branch: string): Promise<Change[]> {
  if (fakeMode) return branch === "main" ? [] : fake.changes;
  const base = await defaultBranch(repo);
  const data = await gh<{
    files?: { filename: string; status: string; additions: number; deletions: number; patch?: string; previous_filename?: string }[];
  }>(`${repoPath(repo)}/compare/${seg(base)}...${seg(branch)}`);
  return (data.files ?? []).map((f) => ({
    path: f.filename,
    status: f.status === "added" ? "added" : f.status === "removed" ? "deleted" : "modified",
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch ?? "",
    ...(f.previous_filename ? { previousPath: f.previous_filename } : {}),
  }));
}

/**
 * Makes one commit with all `files` on `branch`. If `branch` doesn't exist, it's created from `from`
 * (the branch the files were read from), or from the default branch when `from` is left out.
 */
export async function commitFiles(repo: string, branch: string, files: FileEdit[], message: string, from?: string): Promise<Commit> {
  if (!Array.isArray(files) || files.length === 0) throw new GitHubError(400, "Pick at least one file to commit.");
  if (typeof message !== "string" || !message.trim()) throw new GitHubError(400, "Write a commit message.");
  if (fakeMode) return fake.commit(repo, branch, files, message);

  const r = repoPath(repo);
  let parent: string;
  try {
    parent = await branchSha(repo, branch);
  } catch (e) {
    if (!is404(e)) throw e;
    parent = await branchSha(repo, from || (await defaultBranch(repo)));
    await gh(`${r}/git/refs`, { method: "POST", body: { ref: `refs/heads/${branch}`, sha: parent } });
  }

  const baseTree = (await gh<{ tree: { sha: string } }>(`${r}/git/commits/${parent}`)).tree.sha;
  const tree = await gh<{ sha: string }>(`${r}/git/trees`, {
    method: "POST",
    body: {
      base_tree: baseTree,
      tree: files.map((f) =>
        f.content === null
          ? { path: f.path, mode: "100644", type: "blob", sha: null }
          : { path: f.path, mode: "100644", type: "blob", content: f.content },
      ),
    },
  });
  const commit = await gh<{ sha: string; html_url: string }>(`${r}/git/commits`, {
    method: "POST",
    body: { message, tree: tree.sha, parents: [parent] },
  });
  await gh(`${r}/git/refs/heads/${seg(branch)}`, { method: "PATCH", body: { sha: commit.sha } });
  return { sha: commit.sha, url: commit.html_url, branch };
}

/** Opens a pull request from `head` into `base`. If one is already open, returns that one. */
export async function openPullRequest(repo: string, head: string, base: string, title: string, body?: string): Promise<PullRequest> {
  if (fakeMode) return { number: 1, url: `https://github.com/${repo}/pull/1`, title, head, base };
  const r = repoPath(repo);
  type Pull = { number: number; html_url: string; title: string; head: { ref: string }; base: { ref: string } };
  const toPull = (p: Pull): PullRequest => ({ number: p.number, url: p.html_url, title: p.title, head: p.head.ref, base: p.base.ref });
  try {
    return toPull(await gh<Pull>(`${r}/pulls`, { method: "POST", body: { title, head, base, body } }));
  } catch (e) {
    if (!(e instanceof GitHubError && e.status === 422)) throw e;
    const owner = repo.split("/")[0];
    const open = await gh<Pull[]>(
      `${r}/pulls?state=open&head=${encodeURIComponent(`${owner}:${head}`)}&base=${encodeURIComponent(base)}`,
    );
    if (open[0]) return toPull(open[0]);
    throw e;
  }
}

/** A text file's contents, or null if it doesn't exist. `branch: null` means the default branch. */
export async function readFile(repo: string, branch: string | null, path: string): Promise<string | null> {
  if (fakeMode) return path === CONTEXT_PATH ? fake.context(repo) : `// ${path} (fake file)\n`;
  const ref = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  try {
    const file = await gh<{ type?: string; content?: string }>(`${repoPath(repo)}/contents/${seg(path)}${ref}`);
    if (file.type !== "file" || file.content === undefined) throw new GitHubError(400, `${path} is not a file.`);
    return Buffer.from(file.content, "base64").toString("utf8");
  } catch (e) {
    if (is404(e)) return null;
    throw e;
  }
}

/** Every file path on `branch`. */
export async function listFiles(repo: string, branch: string): Promise<string[]> {
  if (fakeMode) return fake.files;
  const sha = await branchSha(repo, branch);
  const data = await gh<{ tree: { path: string; type: string }[] }>(`${repoPath(repo)}/git/trees/${sha}?recursive=1`);
  return data.tree.filter((t) => t.type === "blob").map((t) => t.path);
}

/** COCOMMIT.md on the default branch, or null if the repo doesn't have one yet. */
export async function readContext(repo: string): Promise<string | null> {
  return readFile(repo, null, CONTEXT_PATH);
}

/** Saves COCOMMIT.md on the default branch as one commit. */
export async function writeContext(repo: string, text: string, message: string): Promise<Commit> {
  const branch = fakeMode ? "main" : await defaultBranch(repo);
  return commitFiles(repo, branch, [{ path: CONTEXT_PATH, content: text }], message);
}

const clampLimit = (limit: unknown) => Math.min(Math.max(Math.trunc(Number(limit)) || 10, 1), 100);

/** The latest commits on the default branch, newest first, as activity items for COCOMMIT/LOG.md (see addActivity in context.ts). */
export async function listCommits(repo: string, limit = 10): Promise<Activity[]> {
  const n = clampLimit(limit);
  if (fakeMode) return fake.commits(repo).slice(0, n);
  const data = await gh<{ author: { login: string } | null; commit: { message: string; author: { name: string; date: string } | null } }[]>(
    `${repoPath(repo)}/commits?per_page=${n}`,
  );
  return data.map((c) => ({
    kind: "commit",
    author: c.author?.login ?? c.commit.author?.name ?? "someone",
    text: c.commit.message.split("\n")[0],
    at: c.commit.author?.date ?? new Date(0).toISOString(),
  }));
}

/** Recently merged pull requests, newest first, as activity items for COCOMMIT/LOG.md. `author` is who opened the PR. */
export async function listMergedPulls(repo: string, limit = 10): Promise<Activity[]> {
  const n = clampLimit(limit);
  if (fakeMode) return fake.pulls.slice(0, n);
  // Closed PRs include ones closed without merging, so fetch extra and keep the merged ones.
  const data = await gh<{ number: number; title: string; merged_at: string | null; user: { login: string } | null }[]>(
    `${repoPath(repo)}/pulls?state=closed&sort=updated&direction=desc&per_page=${Math.min(n * 3, 100)}`,
  );
  return data
    .filter((p): p is typeof p & { merged_at: string } => Boolean(p.merged_at))
    .sort((a, b) => b.merged_at.localeCompare(a.merged_at))
    .slice(0, n)
    .map((p) => ({ kind: "pr", author: p.user?.login ?? "someone", text: `merged #${p.number}: ${p.title}`, at: p.merged_at }));
}

// ---------- For the @cocommit bot (server only, not in `actions`)

/** File paths under `folder` on the default branch, plus that branch's name (for links). */
export async function listFolderFiles(repo: string, folder: string): Promise<{ branch: string; paths: string[] }> {
  const prefix = `${folder.replace(/\/+$/, "")}/`;
  if (fakeMode) return { branch: "main", paths: fake.files.filter((p) => p.startsWith(prefix)) };
  const branch = await defaultBranch(repo);
  return { branch, paths: (await listFiles(repo, branch)).filter((p) => p.startsWith(prefix)) };
}

/** Commits on the default branch that changed `path` (a file or folder), newest first. `since` is an ISO date. */
export async function listFileCommits(repo: string, path: string, limit = 10, since?: string): Promise<Activity[]> {
  const n = clampLimit(limit);
  if (fakeMode) return fake.commits(repo).slice(0, n);
  const query = new URLSearchParams({ path, per_page: String(n) });
  if (since && !Number.isNaN(Date.parse(since))) query.set("since", new Date(since).toISOString());
  const data = await gh<{ author: { login: string } | null; commit: { message: string; author: { name: string; date: string } | null } }[]>(
    `${repoPath(repo)}/commits?${query}`,
  );
  return data.map((c) => ({
    kind: "commit",
    author: c.author?.login ?? c.commit.author?.name ?? "someone",
    text: c.commit.message.split("\n")[0],
    at: c.commit.author?.date ?? new Date(0).toISOString(),
  }));
}

/** What browser code may call through POST /api/github/<name> (see github-client.ts). */
export const actions: GitHubActions = {
  getSession,
  listRepos,
  listBranches,
  getChanges,
  commitFiles,
  openPullRequest,
  readFile,
  listFiles,
  readContext,
  writeContext,
  listCommits,
  listMergedPulls,
};

// ---------- Fake mode: used while GITHUB_CLIENT_ID is empty, so the screens work before the keys exist.

const fakeContexts = ((globalThis as { __cocommitFakeContexts?: Map<string, string> }).__cocommitFakeContexts ??=
  new Map<string, string>());
// Fake commits made on "main" during this dev server's life, newest first, so listCommits shows them.
const fakeLog = ((globalThis as { __cocommitFakeLog?: Map<string, Activity[]> }).__cocommitFakeLog ??= new Map<string, Activity[]>());
const minutesAgo = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

const fake = {
  user: { login: "demo-user", name: "Demo User", avatarUrl: "https://github.com/ghost.png" } as User,
  repos: [
    { fullName: "demo/cocommit-demo", defaultBranch: "main", private: false, updatedAt: "2026-10-15T10:00:00Z" },
    { fullName: "demo/todo-app", defaultBranch: "main", private: true, updatedAt: "2026-10-14T18:30:00Z" },
  ] as Repo[],
  branches: ["main", "add-login-page"],
  files: ["COCOMMIT.md", "README.md", "src/app/page.tsx", "src/app/login/page.tsx"],
  changes: [
    {
      path: "src/app/login/page.tsx",
      status: "added",
      additions: 3,
      deletions: 0,
      patch: "@@ -0,0 +1,3 @@\n+export default function Login() {\n+  return <h1>Sign in</h1>;\n+}",
    },
    {
      path: "README.md",
      status: "modified",
      additions: 1,
      deletions: 1,
      patch: "@@ -1,2 +1,2 @@\n # Demo app\n-A to-do app.\n+A to-do app with sign-in.",
    },
  ] as Change[],
  context: (repo: string) =>
    fakeContexts.get(repo) ??
    `# COCOMMIT.md

## Current state
Fake data: the GitHub keys aren't set, so this file only lives in the dev server's memory.

## Who works on what
- demo-user: everything

## Decisions
- None yet.

## Next step
Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.local.

## Recent activity
`,
  commit(repo: string, branch: string, files: FileEdit[], message: string): Commit {
    const context = files.find((f) => f.path === CONTEXT_PATH);
    if (context?.content != null) fakeContexts.set(repo, context.content);
    if (branch === "main") {
      const item: Activity = { kind: "commit", author: fake.user.login, text: message.split("\n")[0], at: new Date().toISOString() };
      fakeLog.set(repo, [item, ...(fakeLog.get(repo) ?? [])]);
    }
    const sha = randomBytes(20).toString("hex");
    return { sha, url: `https://github.com/${repo}/commit/${sha}`, branch };
  },
  commits: (repo: string): Activity[] => [
    ...(fakeLog.get(repo) ?? []),
    { kind: "commit", author: "demo-user", text: "Add login page", at: minutesAgo(25) },
    { kind: "commit", author: "teammate", text: "Fix chat time format", at: minutesAgo(90) },
    { kind: "commit", author: "demo-user", text: "Initial commit", at: minutesAgo(600) },
  ],
  get pulls(): Activity[] {
    return [
      { kind: "pr", author: "demo-user", text: "merged #2: Add login page", at: minutesAgo(20) },
      { kind: "pr", author: "teammate", text: "merged #1: First screens", at: minutesAgo(300) },
    ];
  },
};
