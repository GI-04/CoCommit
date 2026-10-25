// Who may use a repo's chat and call (PLAN/2026-10-16-repo-members-only.md): the repo's members, as GitHub sees them.
// Since PLAN/2026-10-19-security-fixes.md (item 3) a public repo's readers don't count: see accessFromRepo.
// Plain functions shared by the server routes and the browser; no imports, so tests load it directly.

/** member: you belong to the repo (accessFromRepo). not-member: you don't, or GitHub hides it (404/403). no-github: no usable GitHub sign-in. */
export type RepoAccess = "member" | "not-member" | "no-github";

/** GitHub's `permissions` for the signed-in user on a repo, from GET /repos/{repo}. */
export type RepoPermissions = { admin?: boolean; maintain?: boolean; push?: boolean; triage?: boolean; pull?: boolean } | null | undefined;

/**
 * Whether the signed-in user is a member of a repo GitHub showed them. GitHub only shows a private repo to people it lets
 * in, so seeing it is enough. A public repo is shown to everyone, so there only people who work on it count: triage,
 * write, maintain or admin. Someone who can merely read a public repo is not a member, and no permissions means no.
 */
export function accessFromRepo(repo: { private?: boolean | null; permissions?: RepoPermissions }): RepoAccess {
  if (repo.private) return "member";
  const p = repo.permissions;
  return p && (p.admin || p.maintain || p.push || p.triage) ? "member" : "not-member";
}

export const NOT_MEMBER = "You're not a member of this repo, so its chat and call are closed to you.";
export const NEEDS_GITHUB_FOR_REPO = "Sign in with GitHub to use this repo's chat and call.";

/** What a GitHub status for GET /repos/{repo} means. 401 (or no token at all) is "no-github"; other errors are null. A 2xx
 *  only says GitHub showed the repo: who counts as a member then is accessFromRepo's call. */
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
