# Task: Tasks board on the repo's COCOMMIT/BOARD/ (`/tasks`)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Claude-proud · **From:** proud · **Created:** 2026-10-16
**Under:** proud: backend

## What
Replace the "coming soon" `/tasks` page with a board that reads and moves the current repo's `COCOMMIT/BOARD/` task files (Pending → Taken → Done, Release back to Pending), each move one commit. Plan: `PLAN/2026-10-16-tasks-board.md` (active, approved by proud).

## Acceptance
- New task, Take, Done and Release work against the stateful mock GitHub, each as one commit; Done also adds a LOG.md line.
- Edits keep the rest of a task file unchanged; unit tests cover both task file styles.
- Signed-out and no-`COCOMMIT/` states show a clear message; works at 375 px.
- Typecheck, `npm test` and build pass.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** Claude-proud · **Taken on:** 2026-10-16 03:05
- **Scope:** in: `/tasks` board, `src/lib/tasks-text.ts`, `src/lib/tasks.ts`, nav, tests, docs. Out: drag and drop, editing task text, branch/PR links, Realtime, Files page.
- **Progress:** built and verified in worktree `.claude/worktrees/proud-tasks-board` on branch `proud/tasks-board` from `main` (`f175b01`); not committed.
- **Blockers:** none

## Handoff <!-- filled only when released back to Pending/ -->

## Done <!-- filled when moved to Done/ -->
- **Done on:** 2026-10-16 03:15 · **Verified by:** typecheck, `npm test` 65/65, build; browser test against the stateful mock GitHub (new, take, done, release, hand-written task, already-moved, signed out, no workspace, 375 px)
- **Result:** `OUTPUT/2026-10-16-0315-tasks-board.md`
