// Shapes shared by github.ts (server) and github-client.ts / chat.ts (browser).
// Types only, and only from files with no imports (context.ts): browser code must not import github.ts, even for
// types. In the dev server that pulls server code into the page and two open tabs reload each other forever (see GOTCHAS).

import type { Activity } from "./context";
import type { CommitDate } from "./heatmap";

export type { Activity } from "./context";

// Shapes match src/lib/mock.ts so the screens can swap imports.
export type Repo = { fullName: string; defaultBranch: string; private: boolean; updatedAt: string };
export type Change = {
  path: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
  patch: string;
  previousPath?: string;
};
/** One file to commit. `content: null` deletes the file. `encoding: "base64"` means `content` is a binary file's bytes in base64. */
export type FileEdit = { path: string; content: string | null; encoding?: "base64" };
/** A file in COCOMMIT/files/ (see files-util.ts). */
export type SharedFile = { name: string; path: string; size: number };
export type Commit = { sha: string; url: string; branch: string };
export type PullRequest = { number: number; url: string; title: string; head: string; base: string };
export type User = { login: string; name: string | null; avatarUrl: string };
/** `needsReconnect`: signed in with GitHub (Supabase) but the GitHub token is missing or expired: show "Sign in with GitHub". */
export type Session = { user: User | null; fake: boolean; needsReconnect?: boolean };

/** What browser code may call through POST /api/github/<name>; github.ts implements it. */
export type GitHubActions = {
  getSession(): Promise<Session>;
  listRepos(): Promise<Repo[]>;
  listBranches(repo: string): Promise<string[]>;
  getChanges(repo: string, branch: string): Promise<Change[]>;
  /** A missing `branch` is created from `from` (the branch the files came from), else from the default branch. */
  commitFiles(repo: string, branch: string, files: FileEdit[], message: string, from?: string): Promise<Commit>;
  openPullRequest(repo: string, head: string, base: string, title: string, body?: string): Promise<PullRequest>;
  readFile(repo: string, branch: string | null, path: string): Promise<string | null>;
  listFiles(repo: string, branch: string): Promise<string[]>;
  readContext(repo: string): Promise<string | null>;
  writeContext(repo: string, text: string, message: string): Promise<Commit>;
  /** Files in COCOMMIT/files/ on the default branch, sorted by name. */
  listSharedFiles(repo: string): Promise<SharedFile[]>;
  /** A shared file's bytes as base64, or null if it doesn't exist. Only paths directly inside COCOMMIT/files/. */
  downloadFile(repo: string, path: string): Promise<{ content: string; size: number } | null>;
  /** Latest commits on the default branch, newest first, as COCOMMIT/LOG.md activity items. */
  listCommits(repo: string, limit?: number): Promise<Activity[]>;
  /** Recently merged pull requests, newest first, as COCOMMIT/LOG.md activity items. */
  listMergedPulls(repo: string, limit?: number): Promise<Activity[]>;
  /** Who committed and when on the default branch since an ISO date (up to 500), for the home heat map. */
  listCommitDates(repo: string, since: string): Promise<CommitDate[]>;
  /** Invites a GitHub user to the repo as a collaborator. */
  inviteMember(repo: string, username: string): Promise<InviteResult>;
};

/** `invited`: GitHub emailed an invitation; `already`: the person already has access. */
export type InviteResult = { status: "invited" | "already"; username: string };
