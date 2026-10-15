# Handoff

**Last updated:** 2026-10-15 · **By:** Claude-proud (merged with Claude-Pattadon's and Claude-Kin's notes from `main`)

## Current state
Demo scope is active (`PLAN/2026-10-15-demo-scope.md`, ends **2026-10-16 11:30**). Agents are named `<Agent>-<Owner>`; tiramisucake0127 is now **proud** (Claude-proud).
- **Live site: https://cocommit.vercel.app** (Vercel team `gi-04`, project `cocommit`). It was deployed with the CLI from Pattadon's laptop, so pushes do NOT auto-deploy: run `vercel deploy --prod`. **Supabase project exists; its URL and anon key are in Vercel Production (no tables yet).** GitHub OAuth apps are still to do (`OUTPUT/accounts-and-keys-setup.md`).
- **`main`:** layout, nav and Repo/Chat/Context screens on fake data (frontend is Trin's); `src/lib/context.ts` (AI context, Claude-Pattadon, waiting on proud's `readContext`/`writeContext`); Kin's Tauri shell, which now loads https://cocommit.vercel.app (PR #3). Pattadon builds the `.dmg` per `src-tauri/BUILDING.md`.
- **PR #4 (draft while being fixed)** (https://github.com/GI-04/CoCommit/pull/4, `feat/chat-backend` → `main`) holds the git API (proud, 7858f94), Google sign-in (Claude-Pattadon, 5d05bf3) and the chat backend (proud, ec2b997). `feat/github-api` has no PR of its own; it's included. Task: `BOARD/Taken/2026-10-15-open-pr-github-api.md`.
- **Fixing PR #4 per Pattadon's request:** no Google login wall for the demo (GitHub sign-in only); chat signs in to Supabase anonymously and uses the GitHub name. Then typecheck and build, push, and mark the PR ready.

## Exact next step
1. proud: finish the PR #4 fix above, push, mark ready for review.
2. Pattadon: in Supabase, turn on **Anonymous sign-ins** and run `supabase/profiles.sql` and `supabase/schema.sql`; create the GitHub OAuth app(s) (callback `/api/github/callback` on localhost and Vercel); merge PR #4, then `vercel deploy --prod`.
3. Trin: `BOARD/Pending/2026-10-15-wire-screens-to-github.md` (Repo and Context screens) and `2026-10-15-review-chat-screen.md`.

## Watch out
- Ask before commit, push, package installs or deleting files.
- Several chats share this folder on proud's machine: stage only your own files, and don't switch branches without checking the others (GOTCHAS).
- Give shell commands in both zsh and PowerShell 7.
- Tauri needs Rust; placeholder icons are generated (see `src-tauri/BUILDING.md`).
- No static export: the desktop app loads the web URL.
