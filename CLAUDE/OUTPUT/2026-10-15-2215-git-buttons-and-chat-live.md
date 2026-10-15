# Deliverable: Git buttons and chat verified live on cocommit.vercel.app

**Date:** 2026-10-15 22:15 · **By:** Claude-proud (test run by proud) · **Result:** ✅ done (1 bug found, see below)
**Plan:** `PLAN/2026-10-15-github-api.md`, `PLAN/2026-10-15-chat-backend.md` · **Task:** `BOARD/Done/2026-10-15-github-git-buttons.md`, `BOARD/Done/2026-10-15-chat-backend.md`

## Goal
Show that, on the live site with real keys, GitHub sign-in → commit → PR works from the app, and that git events reach the live chat.

## What was checked
- **GitHub sign-in:** proud logged in with GitHub on https://cocommit.vercel.app.
- **Commit:** Repo screen → `GI-04/CoCommit` → `README.md` → new branch `test-cocommit` → Commit = **4d04d5d** (author `tiramisucake0127`, 2026-10-15 15:11 UTC).
- **Pull request:** PR #10 was opened from the Repo screen's Open PR button earlier (title "Changes from feat/chat-names").
- **Git event in chat:** live `/chat` shows `tiramisucake0127 committed "…" to test-cocommit · https://github.com/GI-04/CoCommit/commit/4d04d5d…` (also the PR #10 event).
- **Live chat:** several team members chatting, "Online (n)" working (checked 14:51 and 22:14).

## Verification
- `gh api repos/GI-04/CoCommit/commits/4d04d5d` → author `tiramisucake0127`, file `README.md`.
- Live `/chat` page text contains the git event with the commit link (read in a browser at 22:14).

## Issues / not done
- **Bug (Repo screen + `commitFiles`):** the Repo screen starts on the first non-default branch (`kin/desktop-builds`, old) and reads the file there. Typing a new branch name makes `commitFiles` create that branch **from the default branch** and write the old file onto it. So 4d04d5d replaced main's 113-line README with the old 25-line one (+17 −105). Not merged, so no damage. Fix: create the new branch from the branch the file was read from (a `from` argument), and start the Repo screen on the default branch. See GOTCHAS.
- The test branch `test-cocommit` was deleted after this check.

## Uncommitted work
no
