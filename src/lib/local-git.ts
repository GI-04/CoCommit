// Local git for "use client" screens, in the desktop app only: each call goes to a Rust command
// (src-tauri/src/git.rs) that runs the user's own `git` on a folder they picked.
// Contract: BOARD task 2026-10-15-local-git-rust.md · plan PLAN/2026-10-15-local-git.md.
//
//   import { isDesktop, chooseRepoFolder, getStatus, stage, commit, push } from "@/lib/local-git";
//   if (isDesktop()) { const repo = await chooseRepoFolder(); const s = await getStatus(repo!); }
//
// Dev only: set localStorage "cocommitGitBridge" to a URL (e.g. http://127.0.0.1:4020) to send the same
// calls to a test bridge that runs real git, so the screen can be built and tested in a normal browser.

// Static imports on purpose: `await import("@tauri-apps/…")` made `next dev` (Turbopack) reload /repo
// forever (see GOTCHAS). These only touch Tauri when called, so on the website they're harmless.
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { githubRepoFromRemote, parseStatus, type GitStatus } from "./git-status";

export type { ChangeCode, FileChange, GitStatus } from "./git-status";
export { githubRepoFromRemote } from "./git-status";

export class LocalGitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalGitError";
  }
}

const bridgeUrl = () => {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return null;
  try {
    return localStorage.getItem("cocommitGitBridge");
  } catch {
    return null;
  }
};

/** True inside the CoCommit desktop app (or with the dev test bridge). The website hides Local mode otherwise. */
export function isDesktop(): boolean {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || !!bridgeUrl());
}

async function call(command: string, args: Record<string, unknown>): Promise<string> {
  const bridge = bridgeUrl();
  try {
    if (bridge) {
      const res = await fetch(`${bridge}/${command}`, { method: "POST", body: JSON.stringify(args) });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      return text;
    }
    return await invoke<string>(command, args);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new LocalGitError(friendly(msg));
  }
}

// git's own messages, turned into something people can act on.
function friendly(msg: string): string {
  if (/not a git repository/i.test(msg)) return "That folder isn't a git repository. Pick the folder you cloned.";
  if (/terminal prompts disabled|could not read Username|Authentication failed|Permission denied \(publickey\)/i.test(msg))
    return "Git couldn't log in to GitHub from this computer. Sign in once with GitHub Desktop or `gh auth login`, then try again.";
  if (/Not possible to fast-forward|diverged/i.test(msg)) return "Your branch and GitHub's have both changed. Pull in a terminal to merge, then come back.";
  if (/nothing to commit/i.test(msg)) return "Nothing is staged yet: stage some files first.";
  if (/Please tell me who you are|user\.email/i.test(msg)) return "Git doesn't know your name yet. Run `git config --global user.name` and `user.email` once.";
  if (/rejected.*fetch first|non-fast-forward/i.test(msg)) return "GitHub has commits you don't have yet. Pull first, then push.";
  return msg.trim() || "Git failed without saying why.";
}

/** Opens the folder picker; returns the repo root, or null if cancelled. */
export async function chooseRepoFolder(): Promise<string | null> {
  let picked: string | null = null;
  if (bridgeUrl()) picked = window.prompt("Repo folder (test bridge):");
  else {
    const r = await open({ directory: true, multiple: false, title: "Choose your cloned repository" });
    picked = typeof r === "string" ? r : null;
  }
  return picked ? (await call("git_check", { repo: picked })).trim() : null;
}

export const getStatus = async (repo: string): Promise<GitStatus> => parseStatus(await call("git_status", { repo }));

/** The GitHub "owner/repo" this clone pushes to, or null (no origin, or not on GitHub). */
export async function remoteRepo(repo: string): Promise<string | null> {
  try {
    return githubRepoFromRemote(await call("git_remote_url", { repo }));
  } catch {
    return null;
  }
}

export const getDiff = (repo: string, file: string, mode: "staged" | "unstaged" | "untracked") => call("git_diff", { repo, file, mode });
export const stage = (repo: string, files: string[]) => call("git_stage", { repo, files });
export const unstage = (repo: string, files: string[]) => call("git_unstage", { repo, files });
export const discard = (repo: string, files: string[]) => call("git_discard", { repo, files });
export const commit = (repo: string, message: string) => call("git_commit", { repo, message });
export const pull = (repo: string) => call("git_pull", { repo });
export const push = (repo: string) => call("git_push", { repo });
export const switchBranch = (repo: string, branch: string, create = false) => call("git_switch", { repo, branch, create });
export async function listLocalBranches(repo: string): Promise<string[]> {
  return (await call("git_branches", { repo })).split("\n").map((b) => b.trim()).filter(Boolean);
}
