# AI context workspace (`src/lib/context.ts` + `src/lib/workspace.ts`)

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
Each repo's shared AI context is a `COCOMMIT/` folder laid out like our own `CLAUDE/` (CONTEXT, PROJECT, COLLAB, HANDOFF, TODO, LOG, DECISIONS, GOTCHAS, BOARD/). `context.ts` is pure text in/out (no imports, so `github-types.ts` can use its `Activity` type). `workspace.ts` is for `"use client"` screens: it reads files with `readFile`, applies `context.ts`, and commits with `commitFiles`. Every commit message starts with `COCOMMIT:`.

## Details
- **Screens call:** `loadWorkspace(repo)` (null = not set up; else `{ files, handoff, collab, todo, decisions, gotchas, log }`), `setUpWorkspace(repo, form)` ("Set up team context" button; also puts `@COCOMMIT/CONTEXT.md` atop CLAUDE.md and a pointer line in AGENTS.md, keeping what was there), `saveHandoff`, `addDecisionTo`, `addGotchaTo`, `saveMember`, `saveTodo`, generic `updateFile(repo, key, edit, text)` / `saveFiles(repo, edits, text)`.
- **Edits that change nothing make no commit** (`updateFile` returns null).
- **Log:** `refreshLog(repo)` merges `listCommits` + `listMergedPulls` + `listPinned` into LOG.md with `addActivity` (time-sorted, no duplicates, max 100 lines), skips `COCOMMIT:` commits, commits with `commitFilesQuietly` (no chat event), and returns null when nothing is new. Cheap to call each time the Context screen opens.
- **Chat events:** the other saves use `commitFiles`, so each one posts "committed “COCOMMIT: …”" to the repo's chat. Only the log refresh is quiet.
- **Branch:** commits go to the repo's default branch (from `listRepos`, else `main`).
- **Pure helpers** (for screens that edit in memory first): `parseHandoff`/`renderHandoff`, `parseCollab`/`upsertMember`, `parseTodo`/`renderTodo`, `addDecision`, `addGotcha`, `entryTitles`, `addLogEntry`, `addActivity`, `agentTitle("Claude", owner)`.
- **Test:** `sources/general/workspace-e2e/`. Start `node mock-github-files.mjs` (a fake GitHub on :4011 that really stores commits). Then run the dev server against it: zsh `GITHUB_CLIENT_ID=test-id GITHUB_CLIENT_SECRET=test-secret GITHUB_API_URL=http://127.0.0.1:4011 GITHUB_WEB_URL=http://127.0.0.1:4011 npx next dev -p 3300`; PowerShell 7: set each with `$env:NAME="value"` first. Finally, from that folder, `node --import ./register.mjs workspace-e2e.ts` (Node 22.6+ runs `.ts` directly). It signs in through the app's own routes and checks setup, every save, no-op saves and the log. Pinned chat isn't covered (chat runs in fake mode in Node).

## Sources
- `sources/general/workspace-e2e/`: stateful mock GitHub plus the end-to-end test (passed 2026-10-15)
- `src/lib/context.ts`, `src/lib/workspace.ts`: the code
- `PLAN/2026-10-15-context-workspace.md`: the design

**Last checked against sources:** 2026-10-15
