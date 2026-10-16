// The repo picked on /repo, remembered in this browser so /chat opens that repo's chat
// (PLAN/2026-10-16-demo-polish-kin.md, item 1). Browser code only; storage errors fall back quietly.

/** The team-wide chat, not tied to a repo. Stored as messages.repo = 'general'; repo names always have a "/". */
export const GENERAL = "general";

/** The demo repo, used until a real repo has been picked. */
export const DEFAULT_REPO = "GI-04/CoCommit";

const KEY = "cocommit-current-repo";

/** "owner/name" with GitHub's allowed characters, so "general" (or anything odd) never counts as a repo. */
export function isRepoName(value: string | null | undefined): value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) return false;
  // GitHub has no "." or ".." owners or repos; refusing them keeps paths like "../x" out.
  return value.split("/").every((part) => part !== "." && part !== "..");
}

/** The repo last picked on /repo, or the demo repo. */
export function getCurrentRepo(): string {
  try {
    const saved = localStorage.getItem(KEY);
    return isRepoName(saved) ? saved : DEFAULT_REPO;
  } catch {
    return DEFAULT_REPO;
  }
}

/** Remembers a repo picked from a real repo list (callers skip the signed-out sample list). */
export function setCurrentRepo(fullName: string): void {
  if (!isRepoName(fullName)) return;
  try {
    localStorage.setItem(KEY, fullName);
  } catch {
    // Storage blocked: chat keeps using the demo repo.
  }
}

/** Forgets the picked repo (on sign-out), so the next person on this browser doesn't open that repo's chat. */
export function clearCurrentRepo(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: nothing was saved either.
  }
}
