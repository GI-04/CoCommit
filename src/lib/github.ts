// GitHub sign-in and the git buttons, through the GitHub REST API.
// Server only: it reads the sign-in cookie. Browser code uses github-client.ts.
// While GITHUB_CLIENT_ID is empty, every function returns fake data (see "Fake mode").
// GITHUB_API_URL / GITHUB_WEB_URL can point at GitHub Enterprise or a local fake GitHub for tests.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Activity } from "./context";
import type { CommitDate } from "./heatmap";
import { GitModeError, modesByPath, treeEntries, type TreeListing } from "./git-modes";
import { hasGitHubIdentity } from "./login-identity";
import { getSupabaseServer } from "./supabase-server";
import { isMarkerPath, isSharedPath, MAX_FILE_BYTES, MAX_PARTS, PART_BYTES, partCount, splitShared } from "./files-util";
import { cleanUsername } from "./invite";
import type { Change, Commit, FileEdit, GitHubActions, InviteResult, PullRequest, Repo, Session, SharedFile, SharedListing, User } from "./github-types";

export type { Change, Commit, FileEdit, PullRequest, Repo, Session, SharedFile, User } from "./github-types";

const API = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
const WEB = (process.env.GITHUB_WEB_URL || "https://github.com").replace(/\/$/, "");
// GitHub's raw file host, which can send part of a file (the API always sends all of it). Off for other GitHub hosts.
const RAW = (process.env.GITHUB_RAW_URL || (API === "https://api.github.com" ? "https://raw.githubusercontent.com" : "")).replace(/\/$/, "");
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
  for (const f of files) if (f.parts !== undefined) checkParts(f);
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

  // Binary files: upload the bytes as blobs first (the tree API only takes text), then point the tree at them.
  // Big files arrive as pieces (uploadPart): join them into one blob, so the repo holds the whole file.
  const blobs = new Map<string, string>();
  for (const f of files) {
    if (f.content === null) continue;
    let content = f.encoding === "base64" ? f.content : null;
    if (f.parts) {
      const pieces = [];
      for (const sha of f.parts) pieces.push(Buffer.from((await gh<{ content: string }>(`${r}/git/blobs/${sha}`)).content, "base64"));
      const whole = Buffer.concat(pieces);
      if (whole.length > MAX_FILE_BYTES) throw new GitHubError(413, `${f.path} is bigger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
      content = whole.toString("base64");
    }
    if (content !== null) {
      const blob = await gh<{ sha: string }>(`${r}/git/blobs`, { method: "POST", body: { content, encoding: "base64" } });
      blobs.set(f.path, blob.sha);
    }
  }

  const baseTree = (await gh<{ tree: { sha: string } }>(`${r}/git/commits/${parent}`)).tree.sha;
  // Keep each existing file's mode (executable scripts stay executable; symlinks and submodules are refused).
  // If GitHub truncates the listing, unlisted files fall back to a plain file, as before.
  const listing = await gh<{ tree: TreeListing[]; truncated?: boolean }>(`${r}/git/trees/${baseTree}?recursive=1`);
  let entries;
  try {
    entries = treeEntries(files, modesByPath(listing.tree ?? []), blobs);
  } catch (e) {
    if (e instanceof GitModeError) throw new GitHubError(400, e.message);
    throw e;
  }
  const tree = await gh<{ sha: string }>(`${r}/git/trees`, {
    method: "POST",
    body: { base_tree: baseTree, tree: entries },
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

/** Invites a GitHub user to the repo as a collaborator (needs admin on the repo). */
export async function inviteMember(repo: string, username: string): Promise<InviteResult> {
  const name = cleanUsername(username);
  if (!name) throw new GitHubError(400, "That doesn't look like a GitHub username.");
  const r = repoPath(repo);
  if (fakeMode) return { status: "invited", username: name };
  try {
    const res = await gh<unknown>(`${r}/collaborators/${encodeURIComponent(name)}`, { method: "PUT", body: { permission: "push" } });
    return { status: res === undefined ? "already" : "invited", username: name };
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) throw new GitHubError(404, `Can't find "${name}" on GitHub, or you aren't an admin of ${repo}.`);
    if (e instanceof GitHubError && e.status === 403) throw new GitHubError(403, `Only an admin of ${repo} can invite people.`);
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

/** Files (any folder) and folder markers in COCOMMIT/files/ on the default branch. */
export async function listSharedFiles(repo: string): Promise<SharedListing> {
  if (fakeMode) return listing([...(fakeShared.get(repo) ?? new Map<string, string>())].map(([path, b64]) => ({ path, size: Buffer.from(b64, "base64").length })));
  const sha = await branchSha(repo, await defaultBranch(repo)).catch((e) => (is404(e) ? null : Promise.reject(e)));
  if (!sha) return { files: [], markers: [] };
  const data = await gh<{ tree: { path: string; type: string; size?: number }[] }>(`${repoPath(repo)}/git/trees/${sha}?recursive=1`);
  return listing(data.tree.filter((t) => t.type === "blob").map((t) => ({ path: t.path, size: t.size ?? 0 })));
}

/** One PART_BYTES piece of a shared file as base64 (a small file is one piece), or null if it doesn't exist. */
export async function downloadFile(repo: string, path: string, part = 0): Promise<{ content: string; size: number; parts: number } | null> {
  if (!isSharedPath(path)) throw new GitHubError(400, `Not a shared file: ${path}`);
  if (!Number.isInteger(part) || part < 0) throw new GitHubError(400, "Pick a piece number from 0.");
  if (fakeMode) {
    const b64 = fakeShared.get(repo)?.get(path);
    return b64 === undefined ? null : piece(Buffer.from(b64, "base64"), path, part);
  }
  const commit = await branchSha(repo, await defaultBranch(repo));
  const data = await gh<{ tree: { path: string; type: string; sha: string; size?: number }[] }>(`${repoPath(repo)}/git/trees/${commit}?recursive=1`);
  const entry = data.tree.find((t) => t.type === "blob" && t.path === path);
  if (!entry) return null;
  // A big file: ask the raw host for just this piece, instead of reading the whole file for every piece.
  const size = entry.size ?? 0;
  const parts = partCount(size);
  if (parts > 1 && part < parts) {
    const start = part * PART_BYTES;
    const bytes = await rawRange(repo, commit, path, start, Math.min(size, start + PART_BYTES));
    if (bytes) return { content: bytes.toString("base64"), size, parts };
  }
  return piece(Buffer.from((await gh<{ content: string }>(`${repoPath(repo)}/git/blobs/${entry.sha}`)).content, "base64"), path, part);
}

/** Piece `part` of a whole file's bytes. */
function piece(bytes: Buffer, path: string, part: number): { content: string; size: number; parts: number } {
  const parts = partCount(bytes.length);
  if (part >= parts) throw new GitHubError(400, `${path} has ${parts} piece${parts === 1 ? "" : "s"}.`);
  return { content: bytes.subarray(part * PART_BYTES, (part + 1) * PART_BYTES).toString("base64"), size: bytes.length, parts };
}

/** Bytes [start, end) of `path` at `commit` from the raw host, or null when it can't send exactly that range. */
async function rawRange(repo: string, commit: string, path: string, start: number, end: number): Promise<Buffer | null> {
  if (!RAW) return null;
  repoPath(repo);
  try {
    const res = await fetch(`${RAW}/${repo}/${commit}/${seg(path)}`, {
      headers: { Authorization: `Bearer ${await token()}`, Range: `bytes=${start}-${end - 1}`, "User-Agent": "CoCommit" },
      cache: "no-store",
    });
    if (res.status !== 206) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length === end - start ? bytes : null;
  } catch {
    return null;
  }
}

/** Stores one piece of a big shared file as a git blob (not in any commit until commitFiles joins the pieces). */
export async function uploadPart(repo: string, content: string): Promise<{ sha: string }> {
  if (typeof content !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(content)) throw new GitHubError(400, "Send the piece as base64.");
  const size = Buffer.from(content, "base64").length;
  if (size > PART_BYTES) throw new GitHubError(413, `A piece can be at most ${PART_BYTES / 1024 / 1024} MB.`);
  if (fakeMode) {
    const sha = randomBytes(20).toString("hex");
    fakeParts.set(sha, content);
    return { sha };
  }
  const blob = await gh<{ sha: string }>(`${repoPath(repo)}/git/blobs`, { method: "POST", body: { content, encoding: "base64" } });
  return { sha: blob.sha };
}

function checkParts(f: FileEdit): void {
  const ok = Array.isArray(f.parts) && f.parts.length > 0 && f.parts.length <= MAX_PARTS && f.parts.every((p) => typeof p === "string" && /^[0-9a-f]{40}$/.test(p));
  if (!ok) throw new GitHubError(400, `${f.path}: pieces must be 1 to ${MAX_PARTS} blob ids.`);
  if (!isSharedPath(f.path)) throw new GitHubError(400, `Only Drive files can be sent in pieces: ${f.path}`);
}

/** Sorts a tree's blobs into Drive files and folder markers. */
function listing(blobs: { path: string; size: number }[]): SharedListing {
  const files: SharedFile[] = [];
  const markers: string[] = [];
  for (const b of blobs) {
    if (isMarkerPath(b.path)) markers.push(b.path);
    else if (isSharedPath(b.path)) files.push({ ...splitShared(b.path)!, path: b.path, size: b.size });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, markers: markers.sort() };
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

/** Who committed and when on the default branch since `since` (an ISO date), newest first, for the home heat map. Up to 500 commits. */
export async function listCommitDates(repo: string, since: string): Promise<CommitDate[]> {
  const from = Date.parse(since);
  if (Number.isNaN(from)) throw new GitHubError(400, "since must be a date.");
  if (fakeMode) return fake.commits(repo).filter((c) => Date.parse(c.at) >= from).map(({ author, at }) => ({ author, at }));
  const out: CommitDate[] = [];
  for (let page = 1; page <= 5; page++) {
    const data = await gh<{ author: { login: string } | null; commit: { author: { name: string; date: string } | null } }[]>(
      `${repoPath(repo)}/commits?per_page=100&page=${page}&since=${encodeURIComponent(new Date(from).toISOString())}`,
    );
    for (const c of data) {
      if (!c.commit.author?.date) continue;
      out.push({ author: c.author?.login ?? c.commit.author.name ?? "someone", at: c.commit.author.date });
    }
    if (data.length < 100) break;
  }
  return out;
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

/** `branch`, or the repo's default branch when it's null or empty. */
export async function resolveBranch(repo: string, branch: string | null): Promise<string> {
  if (branch) return branch;
  return fakeMode ? "main" : defaultBranch(repo);
}

/** The whole branch as a .tar.gz (GitHub's tarball download): one request for every file. */
export async function downloadTarball(repo: string, branch: string): Promise<Buffer> {
  if (fakeMode) throw new GitHubError(400, "GitHub isn't set up here (fake mode), so the bot can't read the repo.");
  const res = await fetch(`${API}${repoPath(repo)}/tarball/${seg(branch)}`, {
    headers: { Authorization: `Bearer ${await token()}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "CoCommit" },
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new GitHubError(res.status, res.status === 404 ? `No branch "${branch}" in ${repo}, or no access.` : res.statusText);
  return Buffer.from(await res.arrayBuffer());
}

/** Commits on `branch` (default branch when null) that changed `path` (a file or folder), newest first. `since` is an ISO date. */
export async function listFileCommits(repo: string, path: string, limit = 10, since?: string, branch?: string | null): Promise<Activity[]> {
  const n = clampLimit(limit);
  if (fakeMode) return fake.commits(repo).slice(0, n);
  const query = new URLSearchParams({ per_page: String(n) });
  if (path) query.set("path", path);
  if (branch) query.set("sha", branch);
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

export type IssueState = "open" | "closed" | "all";
export type PullSummary = { number: number; title: string; author: string; state: string; merged: boolean; head: string; base: string; updatedAt: string; url: string };
export type IssueSummary = { number: number; title: string; author: string; state: string; labels: string[]; commentCount: number; updatedAt: string; url: string };
export type Comment = { author: string; at: string; body: string; path?: string; line?: number | null };
export type PullDetail = PullSummary & {
  body: string;
  files: { path: string; status: string; additions: number; deletions: number; patch: string | null }[];
  comments: Comment[];
};
export type IssueDetail = IssueSummary & { body: string; comments: Comment[] };

const issueState = (s: unknown): IssueState => (s === "closed" || s === "all" ? s : "open");
type GhUser = { login: string } | null;
const who = (u: GhUser) => u?.login ?? "someone";

export async function listPulls(repo: string, state: IssueState = "open", limit = 20): Promise<PullSummary[]> {
  if (fakeMode) return [];
  const data = await gh<
    { number: number; title: string; user: GhUser; state: string; merged_at: string | null; head: { ref: string }; base: { ref: string }; updated_at: string; html_url: string }[]
  >(`${repoPath(repo)}/pulls?state=${issueState(state)}&sort=updated&direction=desc&per_page=${clampLimit(limit)}`);
  return data.map((p) => ({
    number: p.number,
    title: p.title,
    author: who(p.user),
    state: p.state,
    merged: Boolean(p.merged_at),
    head: p.head.ref,
    base: p.base.ref,
    updatedAt: p.updated_at,
    url: p.html_url,
  }));
}

export async function getPull(repo: string, number: number): Promise<PullDetail> {
  if (fakeMode) throw new GitHubError(400, "GitHub isn't set up here (fake mode).");
  const n = Math.trunc(Number(number));
  if (!(n > 0)) throw new GitHubError(400, "Give a pull request number.");
  const [p, files, talk, reviews] = await Promise.all([
    gh<{ number: number; title: string; body: string | null; user: GhUser; state: string; merged_at: string | null; head: { ref: string }; base: { ref: string }; updated_at: string; html_url: string }>(
      `${repoPath(repo)}/pulls/${n}`,
    ),
    gh<{ filename: string; status: string; additions: number; deletions: number; patch?: string }[]>(`${repoPath(repo)}/pulls/${n}/files?per_page=100`),
    gh<{ user: GhUser; created_at: string; body: string | null }[]>(`${repoPath(repo)}/issues/${n}/comments?per_page=100`),
    gh<{ user: GhUser; created_at: string; body: string | null; path: string; line: number | null }[]>(`${repoPath(repo)}/pulls/${n}/comments?per_page=100`),
  ]);
  return {
    number: p.number,
    title: p.title,
    author: who(p.user),
    state: p.state,
    merged: Boolean(p.merged_at),
    head: p.head.ref,
    base: p.base.ref,
    updatedAt: p.updated_at,
    url: p.html_url,
    body: p.body ?? "",
    files: files.map((f) => ({ path: f.filename, status: f.status, additions: f.additions, deletions: f.deletions, patch: f.patch ?? null })),
    comments: [
      ...talk.map((c) => ({ author: who(c.user), at: c.created_at, body: c.body ?? "" })),
      ...reviews.map((c) => ({ author: who(c.user), at: c.created_at, body: c.body ?? "", path: c.path, line: c.line })),
    ].sort((a, b) => a.at.localeCompare(b.at)),
  };
}

type GhIssue = { number: number; title: string; body: string | null; user: GhUser; state: string; labels: ({ name?: string } | string)[]; comments: number; updated_at: string; html_url: string; pull_request?: unknown };
const toIssue = (i: GhIssue): IssueSummary => ({
  number: i.number,
  title: i.title,
  author: who(i.user),
  state: i.state,
  labels: i.labels.map((l) => (typeof l === "string" ? l : (l.name ?? ""))).filter(Boolean),
  commentCount: i.comments,
  updatedAt: i.updated_at,
  url: i.html_url,
});

/** Issues only: GitHub's issues list also returns pull requests, which are dropped here. */
export async function listIssues(repo: string, state: IssueState = "open", limit = 20): Promise<IssueSummary[]> {
  if (fakeMode) return [];
  const data = await gh<GhIssue[]>(`${repoPath(repo)}/issues?state=${issueState(state)}&sort=updated&direction=desc&per_page=${clampLimit(limit)}`);
  return data.filter((i) => !i.pull_request).map(toIssue);
}

export async function getIssue(repo: string, number: number): Promise<IssueDetail> {
  if (fakeMode) throw new GitHubError(400, "GitHub isn't set up here (fake mode).");
  const n = Math.trunc(Number(number));
  if (!(n > 0)) throw new GitHubError(400, "Give an issue number.");
  const [i, comments] = await Promise.all([
    gh<GhIssue>(`${repoPath(repo)}/issues/${n}`),
    gh<{ user: GhUser; created_at: string; body: string | null }[]>(`${repoPath(repo)}/issues/${n}/comments?per_page=100`),
  ]);
  return { ...toIssue(i), body: i.body ?? "", comments: comments.map((c) => ({ author: who(c.user), at: c.created_at, body: c.body ?? "" })) };
}

/** Bytes of code per language, biggest first. */
export async function getLanguages(repo: string): Promise<[string, number][]> {
  if (fakeMode) return [];
  const data = await gh<Record<string, number>>(`${repoPath(repo)}/languages`);
  return Object.entries(data).sort((a, b) => b[1] - a[1]);
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
  listSharedFiles,
  downloadFile,
  uploadPart,
  readContext,
  writeContext,
  listCommits,
  listMergedPulls,
  listCommitDates,
  inviteMember,
};

// ---------- Fake mode: used while GITHUB_CLIENT_ID is empty, so the screens work before the keys exist.

const fakeContexts = ((globalThis as { __cocommitFakeContexts?: Map<string, string> }).__cocommitFakeContexts ??=
  new Map<string, string>());
// Fake commits made on "main" during this dev server's life, newest first, so listCommits shows them.
const fakeLog = ((globalThis as { __cocommitFakeLog?: Map<string, Activity[]> }).__cocommitFakeLog ??= new Map<string, Activity[]>());
// Fake pieces of big shared files (uploadPart): blob id → base64.
const fakeParts = ((globalThis as { __cocommitFakeParts?: Map<string, string> }).__cocommitFakeParts ??= new Map<string, string>());
// Fake shared files: repo → path → base64.
const fakeShared = ((globalThis as { __cocommitFakeShared?: Map<string, Map<string, string>> }).__cocommitFakeShared ??= new Map<
  string,
  Map<string, string>
>());
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
    for (const f of files) {
      if (!isSharedPath(f.path) && !isMarkerPath(f.path)) continue;
      const store = fakeShared.get(repo) ?? fakeShared.set(repo, new Map()).get(repo)!;
      if (f.content === null) store.delete(f.path);
      else if (f.parts) {
        const pieces = f.parts.map((sha) => fakeParts.get(sha));
        if (pieces.some((p) => p === undefined)) throw new GitHubError(422, `${f.path}: a piece is missing.`);
        store.set(f.path, Buffer.concat(pieces.map((p) => Buffer.from(p!, "base64"))).toString("base64"));
      } else store.set(f.path, f.encoding === "base64" ? f.content : Buffer.from(f.content).toString("base64"));
    }
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
