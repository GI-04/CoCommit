# Task: GitHub sign-in and git-button API

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** tiramisucake0127 · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
Make the git buttons real, through the GitHub API (Octokit). Install `@octokit/rest` only after asking Pattadon.
- GitHub OAuth sign-in: `src/app/api/github/login` and `callback` routes
- `src/lib/github.ts`, exporting: `listRepos()`, `listBranches(repo)`, `getChanges(repo, branch)`, `commitFiles(repo, branch, files, message)`, `openPullRequest(repo, head, base, title)`, `readContext(repo)` and `writeContext(repo, text, message)` (the last two for `COCOMMIT.md`)
- Keep these names so the screens and the context feature can call them before they're finished. Return fake data at first if needed.

Part of `CLAUDE/PLAN/2026-10-15-demo-scope.md` (deadline **2026-10-16 11:30**). Work on your own branch and merge by PR.

## Acceptance
- From the app: sign in, pick a repo, commit a change and open a PR, and all of it shows up on GitHub.
- The token stays on the server side (no secrets in the browser).

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** — · **Taken on:** —
- **Scope:** —
- **Progress:** —
- **Blockers:** none

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
