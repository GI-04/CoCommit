// The git buttons for browser code ("use client" screens). Same names and arguments as src/lib/github.ts;
// each call goes through POST /api/github/<name>, so the GitHub token never reaches the browser.
//
//   import { listRepos, commitFiles, GitHubRequestError, signInHref } from "@/lib/github-client";
//   try { setRepos(await listRepos()); }
//   catch (e) { if (e instanceof GitHubRequestError && e.status === 401) location.href = signInHref(); }

import { postGitEvent } from "./chat";
import type { GitHubActions as Actions } from "./github-types";

export type { Activity, Change, Commit, FileEdit, PullRequest, Repo, Session, SharedFile, User } from "./github-types";

export class GitHubRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubRequestError";
    this.status = status;
  }
}

function action<K extends keyof Actions>(name: K) {
  return async (...args: Parameters<Actions[K]>): Promise<Awaited<ReturnType<Actions[K]>>> => {
    const res = await fetch(`/api/github/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await res.json().catch(() => ({ error: res.statusText }));
    if (!res.ok) throw new GitHubRequestError(res.status, data?.error ?? res.statusText);
    return data;
  };
}

/** `{ user, fake }`: user is null when not signed in to GitHub; fake is true while the keys aren't set. */
export const getSession = action("getSession");
export const listRepos = action("listRepos");
export const listBranches = action("listBranches");
export const getChanges = action("getChanges");
export const readFile = action("readFile");
export const listFiles = action("listFiles");
export const readContext = action("readContext");
export const listSharedFiles = action("listSharedFiles");
export const downloadFile = action("downloadFile");
/** Latest commits / merged PRs as COCOMMIT/LOG.md activity items (see addActivity in context.ts). */
export const listCommits = action("listCommits");
export const listMergedPulls = action("listMergedPulls");

// These three also post a git event (with the GitHub link) into the repo's chat. If posting fails, the commit still counts.
const announce = (repo: string, summary: string) => void postGitEvent(repo, summary).catch(() => {});

const commit = action("commitFiles");
/** Same as commitFiles, but no git event in chat: for automatic bookkeeping commits such as COCOMMIT/LOG.md updates. */
export const commitFilesQuietly = commit;
export async function commitFiles(...args: Parameters<typeof commit>) {
  const result = await commit(...args);
  announce(args[0], `committed “${args[3]}” to ${result.branch} · ${result.url}`);
  return result;
}

const pull = action("openPullRequest");
export async function openPullRequest(...args: Parameters<typeof pull>) {
  const pr = await pull(...args);
  announce(args[0], `opened pull request #${pr.number} “${pr.title}” (${pr.head} → ${pr.base}) · ${pr.url}`);
  return pr;
}

const saveContext = action("writeContext");
export async function writeContext(...args: Parameters<typeof saveContext>) {
  const result = await saveContext(...args);
  announce(args[0], `updated COCOMMIT.md: “${args[2]}” · ${result.url}`);
  return result;
}

/** Link for a "Sign in with GitHub" button; comes back to `returnTo` afterwards. */
export function signInHref(returnTo = typeof location === "undefined" ? "/repo" : location.pathname): string {
  return `/api/github/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export async function signOutOfGitHub(): Promise<void> {
  const res = await fetch("/api/github/logout", { method: "POST" });
  if (!res.ok) throw new GitHubRequestError(res.status, "Couldn't sign out of GitHub. Try again.");
}
