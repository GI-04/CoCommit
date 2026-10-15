# Tasks board (`/tasks` on `COCOMMIT/BOARD/`)

**Added:** 2026-10-16 · **Kind:** reference

## Takeaway
`/tasks` is a board over the current repo's `COCOMMIT/BOARD/Pending|Taken|Done/*.md` files: the folder is the status, the same files AI agents use. Every button is one commit (write the new path, delete the old one), so chat shows it as a git event. No database table, no packages.

## Details
- **Files:** `src/lib/tasks-text.ts` (pure, no imports: `taskLocation`, `parseTask`, `newTaskText`, `withTaken` / `withDone` / `withHandoff`, `setField`, `taskFileName`), `src/lib/tasks.ts` (browser: `loadBoard`, `createTask`, `takeTask`, `finishTask`, `releaseTask`, `whoAmI`, `TaskMovedError`), `src/app/tasks/page.tsx`. Tests: `tests/tasks.test.mjs`.
- **Repo:** `getCurrentRepo()` (picked on `/repo`, default `GI-04/CoCommit`). Board loads only if `COCOMMIT/CONTEXT.md` exists (`NoWorkspaceError` from `chat-pins.ts` otherwise); signed out or 401 → "Log in with GitHub".
- **Edits keep the file:** a move changes only its own field lines (`**Owner:**`, `**Progress:**`, `**Taken on:**`, `**Verified by:**`, `**Done on:**`) or adds a `## Handoff` line; everything else stays byte for byte. Works for both the COCOMMIT template and our hand-written `CLAUDE/BOARD` style (extra lines, comments in headings, `{{…}}` placeholders). A missing field is added under its section.
- **Moves:** Take → Taken (Owner from COLLAB titles; `whoAmI` matches the GitHub login or name to a COLLAB title or name, else `@login`). Done → Done plus one `COCOMMIT/LOG.md` line (UTC time, like the activity lines) in the same commit. Release → Pending with a handoff note. Before a move the file is read again; gone → "Someone already moved this task." For one minute after its own commit the page falls back to the text it just wrote, in case GitHub's contents API answers with an older copy.
- **File names:** `YYYY-MM-DD-<ascii slug>.md`; a title with no ASCII letters (Thai) → `task-HHMM`; clashes → `-2`, `-3`; checked against GitHub before writing so nothing is overwritten.
- **Commit messages:** `COCOMMIT: new task: …`, `COCOMMIT: task taken|done|released: …` (the `COCOMMIT:` prefix keeps them out of the auto log). Commits under `COCOMMIT/` don't trigger a deploy (`paths-ignore`).
- **Fake mode** (no GitHub keys): the board is empty and saves are fake. Test with the stateful mock (`sources/general/workspace-e2e/mock-github-files.mjs`, see LIB `context-workspace`): seed a board with `POST /__seed`, sign in at `/api/github/login` then `/api/github/callback?code=good-code&state=<state from the redirect>`, set `localStorage["cocommit-current-repo"] = "acme/app"`.
- **Not built:** drag and drop, editing a task's text, links to branches/PRs, live updates (use Refresh), deleting tasks.

## Sources
- `src/lib/tasks-text.ts`, `src/lib/tasks.ts`, `src/app/tasks/page.tsx`, `tests/tasks.test.mjs`: the code and tests
- `PLAN/2026-10-16-tasks-board.md`: the design; `OUTPUT/2026-10-16-0315-tasks-board.md`: verification

**Last checked against sources:** 2026-10-16
