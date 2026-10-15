# Plan: Tasks board on the repo's `COCOMMIT/BOARD/`

**Status:** done: approved by proud (2026-10-16 03:05), merged in PR #30 and live (03:49) <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **By:** Claude-proud · **Asked by:** proud · **Task:** `BOARD/Done/2026-10-16-tasks-board.md` · **Superseded by:** —

## Why
`/tasks` is still a "coming soon" page, but assigning and tracking tasks is one of CoCommit's main promises (PROJECT.md). Every repo with team context already has a task board: `COCOMMIT/BOARD/Pending/`, `Taken/`, `Done/`, one Markdown file per task, and the folder is the status. AI agents already work this way. A Tasks page that reads and moves those same files gives people buttons for it, without a terminal, a new database table or a new package. Demo line: "a teammate's AI agent and a person share one task board, and every move is a commit."

This changes the demo scope (`PLAN/2026-10-15-demo-scope.md` lists the task board as out of scope), the same way Calls was added.

## What the user sees (`/tasks`)
- The board for the current repo (`getCurrentRepo()` from `src/lib/current-repo.ts`, the repo picked on `/repo`; `GI-04/CoCommit` by default). Three columns: **Pending**, **Taken**, **Done**. On phone width the columns stack.
- Each card: title, **To**, **Owner** (in Taken), created date, the first lines of "What", and "View on GitHub".
- Clicking a card opens its full text (plain text, wrapped; no Markdown renderer package).
- **New task** form: Title (required), To (dropdown: "anyone" plus the titles in `COCOMMIT/COLLAB.md`), What, Acceptance (one per line). Saving commits `COCOMMIT/BOARD/Pending/YYYY-MM-DD-<slug>.md`, written in the same shape as `BOARD/_TEMPLATE.md`. From = the signed-in GitHub `@login`.
- Buttons on each card, each one a single commit:
  - Pending → **Take**: asks "Who takes it?" (COLLAB titles; picks the one matching your GitHub login or name when there is one) and an optional Progress note. Moves the file to `Taken/` and fills the `**Owner:** · **Progress:**` line.
  - Taken → **Done**: asks "How was it checked?". Moves the file to `Done/`, fills `**Verified by:**`, and adds one line to `COCOMMIT/LOG.md` in the same commit ("Task done: <title>").
  - Taken → **Release**: asks for a short handoff note. Moves the file back to `Pending/` and adds it under `## Handoff`.
- Commits go through `commitFiles`, so chat shows each move as a git event ("committed “COCOMMIT: task: take …”"). No live refresh: a **Refresh** button, and the board updates right away after your own moves.
- Signed out: "Log in with GitHub to see and move tasks" with the login link. Repo without `COCOMMIT/`: "This repo has no team context yet" (same as the chat Decision/Gotcha buttons).

## Code
- `src/lib/tasks-text.ts` (new, no imports, pure): `parseTask(md)` reads the title, To / From / Created line, What, Acceptance, Owner / Progress / Blockers and Verified by; `newTaskText(form)`; `withTaken(md, owner, progress)`, `withDone(md, verifiedBy)`, `withHandoff(md, note)`; `taskFileName(date, title, taken)` (ASCII slug; a title with no ASCII letters, such as Thai, gets `task-HHMM`; adds `-2`, `-3` when the name is taken). The edits change only their own lines and keep everything else in the file as it was, because agents also write these files by hand (extra `**Under:**` or `**Status:**` lines and so on).
- `src/lib/tasks.ts` (new, browser): `loadBoard(repo)` (`listFiles` on the default branch, filter `COCOMMIT/BOARD/*/*.md` except `_TEMPLATE.md` and `.gitkeep`, then `readFile` each one); `createTask`, `takeTask`, `finishTask`, `releaseTask`. A move is one `commitFiles` call with the new path plus the old path set to `null` (`FileEdit` with `content: null` deletes). Before a move it reads the file at its old path again; if it's gone: "Someone already moved this task. Refresh."
- `src/app/tasks/page.tsx`: the board in place of `ComingSoon`.
- `src/lib/sections.ts`: move Tasks from `comingSoon` to `sections` (Files stays "coming soon").
- `tests/tasks.test.mjs`: loads `tasks-text.ts` with `ts.transpileModule`, like `tests/current-repo.test.mjs`.
- No new packages, no Supabase schema changes. `context.ts` and `workspace.ts` stay as they are (only imported: `BOARD`, `FILES`, `parseCollab`, `addLogEntry`, `workspaceBranch`).
- Docs: README feature row, PROJECT.md (stack and key paths), a new LIB entry `tasks-board` with its pointer, HANDOFF.

## Not in this plan
Drag and drop, editing or deleting a task's text, links to branches and PRs, live updates through Supabase Realtime, and the Files page.

## Branch
`proud/tasks-board` from `main`. Commit and PR only when proud says so; the merge deploys to production (auto-deploy). Demo code freeze 09:30: if it isn't tested by then, it stays off `main`.

## How we'll verify
- `npm run typecheck`, `npm test` and `npm run build` pass.
- Unit tests: the template and a hand-written task in our own `CLAUDE/BOARD` style parse correctly; take, done and release change only their lines (the rest of the file byte for byte the same); file names for English and Thai titles, and the `-2` suffix.
- In the browser against the stateful mock GitHub (LIB `context-workspace` test recipe, `mock-github-files.mjs` on :4011): new task → shows in Pending and the file is in the mock repo; Take → one commit that moves it to `Taken/` with Owner filled; Done → moved to `Done/` plus the LOG line; Release → back in Pending with the handoff note; the "someone already moved it" message; signed out; repo without `COCOMMIT/`; 375 px phone width; no console errors.
- Real GitHub, only if proud agrees: one test task on `GI-04/CoCommit` taken and moved to Done. Commits under `COCOMMIT/` don't trigger a deploy (`paths-ignore` in `deploy-vercel.yml`), but they do land on the team repo's `main` and show up in chat.

## Risks / needs OK
- **Needs proud's OK** to start (the temporary "only destructive plans need review" rule ends at 03:00). Tell Pattadon, since it changes the demo scope. Not destructive: the only deletes are the old path of a moved task, inside the same commit that writes the new one.
- Reading each task is one GitHub call; fine for a team board (tens of files), slow for hundreds.
- GitHub's contents API can return an older copy for a few seconds after a commit, so the page updates from what it just wrote instead of reading again at once.
- The Context screen's "Set up team context" isn't wired yet (Trin), so only repos that already have `COCOMMIT/` (like `GI-04/CoCommit`) get a board.
- In fake mode (no GitHub keys, as in proud's `.env.local` now) the board is empty and saves are fake; test with the mock GitHub above.
- People see Taken tasks on the board. The "don't open Taken/" rule is for agents, so they don't take over claimed work; it doesn't apply to the people the board is for.
- `/tasks` is a new page in Trin's UI area; Trin gets a review heads-up.
- About 2–3 hours of work. Starting by about 03:30 leaves room before the 09:30 freeze.

**Results 2026-10-16 03:15 (Claude-proud):** built as planned on `proud/tasks-board` (worktree `.claude/worktrees/proud-tasks-board`), not committed. Typecheck, `npm test` (65/65) and build pass; every browser check above passed against the stateful mock GitHub (details: `OUTPUT/2026-10-16-0315-tasks-board.md`). Not tested on real GitHub yet. Merged as `aeee87e` (PR #30); live since the 03:49 deploy (see HANDOFF).
