# Handoff

**Last updated:** 2026-10-15 · **By:** Claude-proud (merged with Claude-Pattadon's and Claude-Kin's notes from `main`)

## Current state
Demo scope is active (`PLAN/2026-10-15-demo-scope.md`, ends **2026-10-16 11:30**). Agents are named `<Agent>-<Owner>`; tiramisucake0127 is now **proud** (Claude-proud).
- **Live site: https://cocommit.vercel.app** (Vercel team `gi-04`, project `cocommit`). It was deployed with the CLI from Pattadon's laptop, so pushes do NOT auto-deploy: run `vercel deploy --prod`. **Supabase project exists; its URL and anon key are in Vercel Production (no tables yet).** GitHub OAuth apps are still to do (`OUTPUT/accounts-and-keys-setup.md`).
- **`main`:** layout, nav and Repo/Chat/Context screens on fake data (frontend is Trin's); `src/lib/context.ts` (AI context, Claude-Pattadon, waiting on proud's `readContext`/`writeContext`); Kin's Tauri shell, which loads https://cocommit.vercel.app (PR #3). Pattadon builds the `.dmg` per `src-tauri/BUILDING.md`.
- **PR #4** (https://github.com/GI-04/CoCommit/pull/4, `feat/chat-backend` → `main`, ready for review) holds the git API (proud), Google sign-in (Claude-Pattadon) and the chat backend (proud), fixed per Pattadon's request: **no Google login wall** (`REQUIRE_GOOGLE_LOGIN=true` turns it back on); chat signs in to Supabase anonymously and shows the GitHub name. Typecheck and build pass. Tasks: `BOARD/Taken/2026-10-15-open-pr-github-api.md`, `...-github-git-buttons.md`, `...-chat-backend.md`. `feat/github-api` has no PR of its own; it's included.
- Not tested yet: real GitHub (no OAuth keys) and real Supabase (needs the setup below).

## Exact next step
1. Pattadon: in Supabase turn on **Allow anonymous sign-ins**, run `supabase/profiles.sql` then `supabase/schema.sql`; review and merge PR #4; `vercel deploy --prod`; check the live site opens with no login wall. Create the GitHub OAuth app(s) (callback `/api/github/callback` on localhost and Vercel).
2. proud: after deploy, test chat in two browsers on the live site; after the OAuth keys, test sign-in → commit → PR on a test repo.
3. Trin: `BOARD/Pending/2026-10-15-wire-screens-to-github.md` (Repo and Context screens) and `2026-10-15-review-chat-screen.md`.

## Watch out
- Ask before commit, push, package installs or deleting files.
- Browser code must not import `src/lib/github.ts`, even for types (dev reload loop; GOTCHAS). Use `src/lib/github-types.ts`.
- Several chats share this folder on proud's machine: stage only your own files, and don't switch branches without checking the others (GOTCHAS).
- Give shell commands in both zsh and PowerShell 7.
- Tauri needs Rust; placeholder icons are generated (see `src-tauri/BUILDING.md`).
- No static export: the desktop app loads the web URL.
