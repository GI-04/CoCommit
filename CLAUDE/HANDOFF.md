# Handoff

**Last updated:** 2026-10-15 · **By:** Claude-proud (merged with Claude-Pattadon's and Claude-Kin's notes from `main`)

## Current state
Demo scope is active (`PLAN/2026-10-15-demo-scope.md`, ends **2026-10-16 11:30**). Agents are named `<Agent>-<Owner>`; tiramisucake0127 is now **proud** (Claude-proud).
- **Live site: https://cocommit.vercel.app** (Vercel team `gi-04`, project `cocommit`). It was deployed with the CLI from Pattadon's laptop, so pushes do NOT auto-deploy: run `vercel deploy --prod`. Keys: Pattadon follows `OUTPUT/accounts-and-keys-setup.md` (GitHub OAuth apps and Supabase still to do).
- **`main`:** layout, nav and Repo/Chat/Context screens on fake data (frontend is Trin's); `src/lib/context.ts` (AI context, Claude-Pattadon, waiting on proud's `readContext`/`writeContext`); Kin's Tauri shell (Windows `.msi` builds; the window loads `http://localhost:3000` until the Vercel URL is put in `src-tauri/tauri.conf.json` `build.frontendDist`).
- **`feat/github-api` (pushed, no PR yet):** the git API (proud, 7858f94: `src/lib/github.ts`, `github-client.ts`, `src/app/api/github/`; tested in fake mode and against a fake GitHub, not on real GitHub) and Google sign-in (Claude-Pattadon, 5d05bf3; not tested with real keys). PR waits for proud to talk with Pattadon.
- **`feat/chat-backend` (local, not pushed):** made from `feat/github-api` with `main` merged in. Chat backend in progress: plan `PLAN/2026-10-15-chat-backend.md` (active, option A: proud also wires `/chat`); task `BOARD/Taken/2026-10-15-chat-backend.md`.

## Exact next step
1. proud: build the chat backend per its plan (`supabase/schema.sql`, `src/lib/chat.ts`, git events from `github-client.ts`, wire `/chat`), test in two tabs, then commit (ask first). PR order: `feat/github-api` first, then `feat/chat-backend`.
2. Trin: `BOARD/Pending/2026-10-15-wire-screens-to-github.md` (Repo and Context screens).
3. Pattadon: GitHub OAuth app(s) with callback `/api/github/callback` (localhost and Vercel) and the Supabase project; run `supabase/profiles.sql` (and `schema.sql` once it lands).
4. Kin: put https://cocommit.vercel.app in `build.frontendDist`, rebuild; Pattadon builds the `.dmg` per `src-tauri/BUILDING.md`.

## Watch out
- Ask before commit, push, package installs or deleting files.
- Several chats share this folder on proud's machine: stage only your own files, and don't switch branches without checking the others (GOTCHAS).
- Give shell commands in both zsh and PowerShell 7.
- Tauri needs Rust; placeholder icons are generated (see `src-tauri/BUILDING.md`).
- No static export: the desktop app loads the web URL.
