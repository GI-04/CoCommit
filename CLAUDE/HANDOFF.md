# Handoff

**Last updated:** 2026-10-15 · **By:** Claude-Kin (on top of Claude-proud and Claude-Pattadon's notes)

## Current state
Demo scope is active (`PLAN/2026-10-15-demo-scope.md`, ends **2026-10-16 11:30**). Agents are named `<Agent>-<Owner>`; tiramisucake0127 is now **proud** (Claude-proud); rename task Done.
- **Live site: https://cocommit.vercel.app** (Vercel team `gi-04`, project `cocommit`). It's deployed with the CLI, so pushes do NOT auto-deploy: run `vercel deploy --prod` (add `--force` after changing env vars; see GOTCHAS) from a clean checkout of `main`.
- **On `main`:** PR #4 (git API, Google sign-in switched off, real chat; Supabase set up with anonymous sign-ins and both SQL files) and PR #5 (activity feed `listCommits` / `listMergedPulls` / `listPinned` for `COCOMMIT/LOG.md`, plus `commitFilesQuietly`). **GitHub OAuth keys are live** (`getSession` → `"fake":false`). The sidebar has a "Log in" button → `/login` (GitHub recommended, Google greyed out until set up).
- **AI context = `COCOMMIT/` team workspace** (`PLAN/2026-10-15-context-workspace.md`). Next is the load/save layer (Claude-Pattadon); note `BOARD/Pending/2026-10-15-use-recent-activity-feed.md` shows how to fill LOG.md.
- Desktop: Kin's Tauri app loads the live site (PR #3). Pattadon builds the `.dmg` per `src-tauri/BUILDING.md`.
- **`feat/chat-names` (proud, pushed, no PR):** "Change name" in chat. It clashes with the login-backend task (names from GitHub, no posting as someone else), so it's on hold as a fallback.
- Chat test message "Guest 330" (Claude-Pattadon's) is still in `messages`: delete it before the demo.

## Exact next step
1. proud: decide whether to take `BOARD/Pending/2026-10-15-login-backend.md` parts 1–6 (GitHub as the one app identity; plan first). Meanwhile, sign in with GitHub on the live site once to check it.
2. Claude-Pattadon: `loadWorkspace` / `saveWorkspace` (context-workspace step 2), using the activity feed.
3. Trin: login frontend, `wire-screens-to-github`, `review-chat-screen`, the tabbed Context screen.
4. Pattadon: dev OAuth app for localhost (login-backend part 8); decide on Google (part 9).
5. Email/password login (`PLAN/2026-10-15-email-password-login.md`, active): Kin's backend is merged (PR #6: `src/lib/auth-email.ts`, `src/lib/permissions.ts`). Pattadon: in Supabase turn on the Email provider, turn Confirm email off for the demo, add `https://cocommit.vercel.app/auth/*` and `http://localhost:3000/auth/*` to Redirect URLs, and re-run `supabase/profiles.sql`. Trin: the form (`BOARD/Pending/2026-10-15-email-login-frontend.md`); `signUpWithEmail` also returns `needsConfirmation`.

## Watch out
- Ask before commit, push, package installs or deleting files.
- Browser code must not import `src/lib/github.ts`, even for types (dev reload loop; GOTCHAS). Use `src/lib/github-types.ts`.
- Several chats share this folder on proud's machine: stage only your own files, and don't switch branches without checking the others (GOTCHAS).
- Give shell commands in both zsh and PowerShell 7.
- Tauri needs Rust; placeholder icons are generated (see `src-tauri/BUILDING.md`).
- No static export: the desktop app loads the web URL.
