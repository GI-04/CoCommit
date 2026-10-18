// Who may use a repo's chat and call (PLAN/2026-10-16-repo-members-only.md): only people GitHub lets see the repo.
// Plain functions shared by the server routes and the browser; no imports, so tests load it directly.

/** member: GitHub shows you the repo. not-member: it doesn't (404/403). no-github: no usable GitHub sign-in. */
export type RepoAccess = "member" | "not-member" | "no-github";

export const NOT_MEMBER = "You're not a member of this repo, so its chat and call are closed to you.";
export const NEEDS_GITHUB_FOR_REPO = "Sign in with GitHub to use this repo's chat and call.";

/** What a GitHub answer for GET /repos/{repo} means. 401 (or no token at all) is "no-github"; other errors are null. */
export function accessFromStatus(status: number): RepoAccess | null {
  if (status >= 200 && status < 300) return "member";
  if (status === 401) return "no-github";
  if (status === 403 || status === 404) return "not-member";
  return null;
}

/** The HTTP error a route sends for a closed repo, or null when the caller is a member. */
export function accessError(access: RepoAccess): { status: number; error: string; access: RepoAccess } | null {
  if (access === "member") return null;
  return { status: 403, error: access === "no-github" ? NEEDS_GITHUB_FOR_REPO : NOT_MEMBER, access };
}
