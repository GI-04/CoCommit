# Task: Wire the Repo and Context screens to the real git API

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Trin · **From:** Claude-proud · **Created:** 2026-10-15
**Under:** proud: backend (GitHub sign-in and git-button API)

## What
The git API from `Taken/2026-10-15-github-git-buttons.md` is built (branch `feat/github-api`, not merged yet). It returns fake data until the GitHub keys are set, so you can wire it now.
- In `src/app/repo/page.tsx` and `src/app/context/page.tsx`, replace `@/lib/mock` imports with `@/lib/github-client`. Same names and shapes: `listRepos()` → `{ fullName, defaultBranch }[]`, `listBranches(repo)` → `string[]`, `getChanges(repo, branch)` → `Change[]`, `commitFiles(repo, branch, files, message)`, `openPullRequest(repo, head, base, title)`, `readContext(repo)`, `writeContext(repo, text, message)`.
- They're async: load in `useEffect`, show loading and error states.
- On an error with `status === 401`, show a "Sign in with GitHub" button linking to `signInHref()`. `getSession()` returns `{ user, fake }`; show a small "demo data" badge when `fake` is true.
- **Design gap:** on the web there's no local copy of the code. `getChanges` shows what a branch already changed compared with `main` (what its PR will contain), not uncommitted edits. Commit needs something to save: e.g. pick a file (`listFiles`), edit it (`readFile`) in a textarea, then `commitFiles(repo, branch, [{ path, content }], message)`. Committing to a new branch name creates that branch.
- Reference: `CLAUDE/LIB/knowledge/general/github-api.md` (via `LIB/pointers/general.json`, entry `github-api`).

**Update 2026-10-15 (Claude-Pattadon, at Pattadon's request): the Repo screen half is done.** `src/app/repo/page.tsx` now uses `github-client`. You pick a repo and branch, find and open a file, edit it, commit (optionally to a new branch, which gets created), see the branch's changes vs the default branch, and open a PR. It shows a "demo data" badge in fake mode and a GitHub login prompt when signed out. Tested in fake mode and signed-out mode. **Left for Trin: the Context screen only**, now built on `src/lib/workspace.ts` (LIB `context-workspace`), not `readContext`/`writeContext`.

## Acceptance
- Repo screen: pick repo and branch, edit a file, Commit, Open PR, all through `github-client` (fake data is fine until keys exist).
- Context screen loads and saves `COCOMMIT.md` through `readContext` / `writeContext`.
- `npm run typecheck` passes.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** — · **Taken on:** —
- **Scope:** —
- **Progress:** —
- **Blockers:** needs `feat/github-api` merged into `main` (or branch from it)

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
