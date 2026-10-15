# Handoff

**Last updated:** 2026-10-15 · **By:** Claude-Pattadon (merged with Claude-proud's and Claude-Kin's notes)

## Current state
Demo scope is active (`PLAN/2026-10-15-demo-scope.md`, ends **2026-10-16 11:30**). Agents are named `<Agent>-<Owner>`; tiramisucake0127 is now **proud** (Claude-proud).
- **Live site: https://cocommit.vercel.app** (Vercel team `gi-04`, project `cocommit`). It's deployed with the CLI, so pushes do NOT auto-deploy: run `vercel deploy --prod` from a clean checkout of `main`.
- **PR #4 is merged and deployed** (520eedf): git API (fake mode until the OAuth keys exist), Google sign-in (off; `REQUIRE_GOOGLE_LOGIN=true` turns it on), and **real chat**. Supabase is set up: anonymous sign-ins on, `profiles.sql` and `schema.sql` run. Chat was tested live; Claude-Pattadon's test message ("Guest 330") is in `messages`, so delete it before the demo.
- **AI context = `COCOMMIT/` team workspace** (`PLAN/2026-10-15-context-workspace.md`, active). `src/lib/context.ts` builds and edits it. Next is the load/save layer on `readFile`/`commitFiles` (Claude-Pattadon). The Context screen tabs are Trin's.
- Desktop: Kin's Tauri app loads the live site (PR #3). Pattadon builds the `.dmg` per `src-tauri/BUILDING.md`.
- GitHub OAuth apps: still to do (Pattadon, `OUTPUT/accounts-and-keys-setup.md`). Until then sign-in and git buttons use fake data.
- **PR #5** (https://github.com/GI-04/CoCommit/pull/5, `feat/recent-activity` → `main`): `listCommits`, `listMergedPulls`, `listPinned` return `Activity` items for `COCOMMIT/LOG.md` (`addActivity` in `context.ts`), plus `commitFilesQuietly`. Plan `PLAN/2026-10-15-recent-activity.md`; note for Claude-Pattadon `BOARD/Pending/2026-10-15-use-recent-activity-feed.md`. Open-PR task is in Done.
- **`feat/chat-names` (proud, from `feat/recent-activity`):** "Change name" in chat (`setMyName`), so people aren't "Guest 123" before GitHub sign-in works. Plan `PLAN/2026-10-15-chat-names.md`. Tested in two tabs; PR after #5.

## Exact next step
1. Pattadon: create the two GitHub OAuth apps (callback `/api/github/callback` on localhost and on https://cocommit.vercel.app), add the keys to `.env.local` and Vercel, then redeploy.
2. Claude-Pattadon: `loadWorkspace` / `saveWorkspace` in a new `src/lib/workspace.ts` (step 2 of the context-workspace plan).
3. proud: test sign-in → commit → PR on a test repo once the OAuth keys exist.
4. Trin: `BOARD/Pending/2026-10-15-wire-screens-to-github.md`, `...-review-chat-screen.md`, and the tabbed Context screen (`...-layout-and-screens.md`).

## Watch out
- Ask before commit, push, package installs or deleting files.
- Browser code must not import `src/lib/github.ts`, even for types (dev reload loop; GOTCHAS). Use `src/lib/github-types.ts`.
- Several chats share this folder on proud's machine: stage only your own files, and don't switch branches without checking the others (GOTCHAS).
- Give shell commands in both zsh and PowerShell 7.
- Tauri needs Rust; placeholder icons are generated (see `src-tauri/BUILDING.md`).
- No static export: the desktop app loads the web URL.
