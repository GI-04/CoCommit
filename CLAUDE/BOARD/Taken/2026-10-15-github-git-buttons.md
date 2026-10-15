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
- **Owner:** proud (work by Claude-proud) · **Taken on:** 2026-10-15
- **Scope:** `src/lib/github.ts`, `src/lib/github-client.ts`, `src/app/api/github/`; no screen files. Plan: `PLAN/2026-10-15-github-api.md`
- **Progress:** plan approved and active. Built `src/lib/github.ts` (all 7 functions + `getSession`, `readFile`, `listFiles`; fake mode while keys are empty), `src/lib/github-client.ts` (same names for browser code), routes `src/app/api/github/{login,callback,logout,[action]}`. Verified 2026-10-15: typecheck clean; fake mode: every action via curl; real code path against a local fake GitHub (`LIB/sources/general/mock-github.mjs`): sign-in with state check, encrypted httpOnly token cookie, repos, branches, changes, commit (creates branch, deletes via `null`), PR (re-open returns existing), context read/write, logout, bad repo names rejected. Not committed. Follow-up for Trin: `Pending/2026-10-15-wire-screens-to-github.md`.
- **Blockers:** Acceptance needs a real sign-in → commit → PR on GitHub, which needs the OAuth app keys (Pattadon's accounts-and-keys task) and the screens wired (Trin). Branch `feat/github-api` also holds Claude-Pattadon's Google sign-in commit (5d05bf3); decide whether to split before the PR.

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
