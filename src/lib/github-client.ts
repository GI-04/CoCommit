// The git buttons for browser code ("use client" screens). Same names and arguments as src/lib/github.ts;
// each call goes through POST /api/github/<name>, so the GitHub token never reaches the browser.
//
//   import { listRepos, commitFiles, GitHubRequestError, signInHref } from "@/lib/github-client";
//   try { setRepos(await listRepos()); }
//   catch (e) { if (e instanceof GitHubRequestError && e.status === 401) location.href = signInHref(); }

import type { actions } from "./github";

export type { Change, Commit, FileEdit, PullRequest, Repo, Session, User } from "./github";

type Actions = typeof actions;

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
export const commitFiles = action("commitFiles");
export const openPullRequest = action("openPullRequest");
export const readFile = action("readFile");
export const listFiles = action("listFiles");
export const readContext = action("readContext");
export const writeContext = action("writeContext");

/** Link for a "Sign in with GitHub" button; comes back to `returnTo` afterwards. */
export function signInHref(returnTo = typeof location === "undefined" ? "/repo" : location.pathname): string {
  return `/api/github/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export async function signOutOfGitHub(): Promise<void> {
  await fetch("/api/github/logout", { method: "POST" });
}
