# Plan: New branches start from the branch you're on

**Status:** done <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **By:** Claude-proud · **Task:** bug in GOTCHAS ("Commit to a new branch overwrote newer files with an old copy"); approach given by proud · **Superseded by:** —

## Bug
The Repo screen started on the first non-default branch (old `kin/desktop-builds`), read README there, and committing to a new branch made `commitFiles` create it from `main`. The old file overwrote main's newer one (4d04d5d).

## Fix
1. `commitFiles(repo, branch, files, message, from?)` (`src/lib/github.ts`, `github-types.ts`): when `branch` doesn't exist, create it from `from` if given, else from the default branch (as before). `from` is checked like any branch name.
2. Repo screen (`src/app/repo/page.tsx`): pass the branch the file was opened from as `from`, and start on the default branch (`main`) instead of the first other branch.
3. Workspace commits stay on the default branch (no change).

## Verify
Typecheck, `npm test`, build. Against the fake GitHub: committing to a new branch with `from` creates it at `from`'s commit, and without `from` at main's. In the browser (fake mode): the Repo screen starts on `main`.

## Results 2026-10-15 22:50
- Typecheck, `npm test` (16 passed), build.
- Fake GitHub: new `feature/x` with no `from` → created at `sha-main` (as before); new `feature/y` with `from: feature/x` → created at feature/x's tip (`commit-new`); `from: "../main"` → 400, no branch created.
- Production build in the browser (`next start`, fake mode): the Repo screen starts on `main` (options `main`, `add-login-page`). After switching to `add-login-page`, opening README and committing to `new-from-test`, the request carried `from: "add-login-page"`.
- `next dev` reloads `/repo` on its own (also on `main`, not caused by this fix), so the browser check used `next start`. Recorded in GOTCHAS.
