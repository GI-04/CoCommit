# Handoff

**Last updated:** 2026-10-15 · **By:** Claude-proud (Google section by Claude-Pattadon)

## Current state
Demo scope is active (`PLAN/2026-10-15-demo-scope.md`, ends **2026-10-16 11:30**). `main` has the layout, nav and Repo/Chat/Context screens running on fake data (`src/lib/mock.ts`). The frontend belongs to Trin now. Agents are named `<Agent>-<Owner>`; tiramisucake0127 is now **proud** (Claude-proud).

Branch `feat/github-api` (pushed) holds two features:
- **Git API (Claude-proud), not committed yet:** `src/lib/github.ts`, `src/lib/github-client.ts`, `src/app/api/github/{login,callback,logout,[action]}`. Plan `PLAN/2026-10-15-github-api.md` (active); task `BOARD/Taken/2026-10-15-github-git-buttons.md`. Typecheck clean. Tested in fake mode and against a local fake GitHub (`LIB/sources/general/mock-github.mjs`). **Not tested on real GitHub** (no OAuth keys yet). How it works: LIB entry `github-api`.
- **Google sign-in (Claude-Pattadon), committed 5d05bf3:** `src/lib/supabase.ts`, `supabase-server.ts`, `src/proxy.ts` (skips `/api`), `src/app/login`, `src/app/auth/{callback,signout}`, `src/components/UserChip.tsx` (in `Nav`), `supabase/profiles.sql`. Plan `PLAN/2026-10-15-google-signin.md` (active). Demo mode checked in browser; **not tested with real keys.** Next: Pattadon follows `OUTPUT/google-signin-setup.md`. Still open: replace `me` in `mock.ts` with the real user.

## Exact next step
1. proud: commit only the git-API files on `feat/github-api` (`src/lib/github.ts`, `src/lib/github-client.ts`, `src/app/api/github`, plus this loop's `CLAUDE/` changes: BOARD, PLAN/2026-10-15-github-api.md, LIB, LOG, DECISIONS, GOTCHAS, TODO, HANDOFF), then decide with Pattadon whether to push as-is (one PR, both features) or split the git API onto its own branch before the PR.
2. Trin: `BOARD/Pending/2026-10-15-wire-screens-to-github.md` (swap `@/lib/mock` for `@/lib/github-client`).
3. Pattadon: GitHub OAuth app with callback `/api/github/callback` for localhost and Vercel (maybe two apps), then put the keys in `.env.local` and Vercel; then proud runs the real end-to-end test.

## Watch out
- Ask before commit, push, package installs or deleting files.
- Two chats share this folder: stage only your own files, and don't switch branches without checking with the other chat (GOTCHAS).
- Give shell commands in both zsh and PowerShell 7.
- Tauri needs Rust and generated icons (`npx tauri icon logo.png`) before `npm run tauri dev`.
- Static export (Tauri build) can't include API routes; see GOTCHAS.
