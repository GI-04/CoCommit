// Shapes shared by github.ts (server) and github-client.ts / chat.ts (browser).
// Types only, and only from files with no imports (context.ts): browser code must not import github.ts, even for
// types. In the dev server that pulls server code into the page and two open tabs reload each other forever (see GOTCHAS).

import type { Activity } from "./context";

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
/** One file to commit. `content: null` deletes the file. */
export type FileEdit = { path: string; content: string | null };
export type Commit = { sha: string; url: string; branch: string };
export type PullRequest = { number: number; url: string; title: string; head: string; base: string };
export type User = { login: string; name: string | null; avatarUrl: string };
export type Session = { user: User | null; fake: boolean };

/** What browser code may call through POST /api/github/<name>; github.ts implements it. */
export type GitHubActions = {
  getSession(): Promise<Session>;
  listRepos(): Promise<Repo[]>;
  listBranches(repo: string): Promise<string[]>;
  getChanges(repo: string, branch: string): Promise<Change[]>;
  commitFiles(repo: string, branch: string, files: FileEdit[], message: string): Promise<Commit>;
  openPullRequest(repo: string, head: string, base: string, title: string, body?: string): Promise<PullRequest>;
  readFile(repo: string, branch: string | null, path: string): Promise<string | null>;
  listFiles(repo: string, branch: string): Promise<string[]>;
  readContext(repo: string): Promise<string | null>;
  writeContext(repo: string, text: string, message: string): Promise<Commit>;
  /** Latest commits on the default branch, newest first, as COCOMMIT/LOG.md activity items. */
  listCommits(repo: string, limit?: number): Promise<Activity[]>;
  /** Recently merged pull requests, newest first, as COCOMMIT/LOG.md activity items. */
  listMergedPulls(repo: string, limit?: number): Promise<Activity[]>;
};
