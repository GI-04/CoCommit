# Handoff

**Last updated:** 2026-10-15 · **By:** Codex-Pattadon (profile feature; prior operational notes retained)

## Current state
Demo scope is active (`PLAN/2026-10-15-demo-scope.md`, ends **2026-10-16 11:30**). Agents are named `<Agent>-<Owner>`; tiramisucake0127 is now **proud** (Claude-proud); rename task Done.
- **Live site: https://cocommit.vercel.app** (Vercel team `gi-04`, project `cocommit`). It's deployed with the CLI, so pushes do NOT auto-deploy: run `vercel deploy --prod` (add `--force` after changing env vars; see GOTCHAS) from a clean checkout of `main`.
- **On `main`:** PR #4 (git API, Google sign-in switched off, real chat; Supabase set up with anonymous sign-ins and both SQL files) and PR #5 (activity feed `listCommits` / `listMergedPulls` / `listPinned` for `COCOMMIT/LOG.md`, plus `commitFilesQuietly`). **GitHub OAuth keys are live** (`getSession` → `"fake":false`). The sidebar has a "Log in" button → `/login` (GitHub recommended; Google availability is read from Supabase). Google setup was reported complete in `OUTPUT/2026-10-15-1530-google-login.md`; live settings were not rechecked in this reading pass.
- **AI context = `COCOMMIT/` team workspace** (`PLAN/2026-10-15-context-workspace.md`). The load/save layer and activity refresh already exist in `src/lib/workspace.ts`; the feed task is in `BOARD/Done/`. The Context screen still uses mock data and needs wiring.
- Desktop: Kin's Tauri app loads the live site (PR #3). Pattadon builds the `.dmg` per `src-tauri/BUILDING.md`.
- **`feat/chat-names` (proud, pushed, no PR):** "Change name" in chat. It clashes with the login-backend task (names from GitHub, no posting as someone else), so it's on hold as a fallback.
- Chat test message "Guest 330" (Claude-Pattadon's) is still in `messages`: delete it before the demo.

## Chat pins handoff (2026-10-15, Codex-proud)
Merged into main (pending production deployment): `src/lib/chat-pins.ts` and Decision/Gotcha forms in `/chat`. Approved plan: `PLAN/2026-10-15-chat-pins.md`. Previous browser checks cover both forms, cancel, signed-out and missing-workspace cases; typecheck and production build passed again this session. Real GitHub saving has not been tested. Next: production deploy by the teammate with Vercel access, then verify real GitHub saving; coordinate page changes through Trin's review task.

## Exact next step
0. Profile deployment authorized by Pattadon; preparing push to main and production deploy. Profile page implemented: `/profile`, accessible from the sidebar name/avatar. Supabase name/photo saves, email/password account settings, GitHub account/settings card and combined sign-out. Live authenticated edits remain a manual QA check. Previous production deployment for rollback: `https://cocommit-l66vm0d6k-gi-04.vercel.app`. See `OUTPUT/2026-10-15-account-profile.md`.
1. proud: decide whether to take `BOARD/Pending/2026-10-15-login-backend.md` parts 1–6 (GitHub as the one app identity; plan first). Meanwhile, sign in with GitHub on the live site once to check it.
2. Context frontend owner (Trin): wire the tabbed Context screen and setup flow to the existing `src/lib/workspace.ts` helpers; no new load/save layer is needed.
3. Trin: login frontend, `wire-screens-to-github`, `review-chat-screen`, the tabbed Context screen.
4. Pattadon: dev OAuth app for localhost (login-backend part 8); decide on Google (part 9).
5. Email/password login (`PLAN/2026-10-15-email-password-login.md`, active): Kin's backend is merged (PR #6: `src/lib/auth-email.ts`, `src/lib/permissions.ts`). Pattadon: in Supabase turn on the Email provider, turn Confirm email off for the demo, add `https://cocommit.vercel.app/auth/*` and `http://localhost:3000/auth/*` to Redirect URLs, and re-run `supabase/profiles.sql`. Trin: the form (`BOARD/Pending/2026-10-15-email-login-frontend.md`); `signUpWithEmail` also returns `needsConfirmation`.

## Repository reading (2026-10-15)
- Source inspected at `24137f0`: GitHub Repo UI and chat implemented; chat still selects the fixed mock repo; Context UI remains mock; email/reset UI absent.
- Local git TypeScript UI/bridge exists, but Rust commands, dialog registration and remote IPC capability are absent from this checkout. Kin owns that pending task.
- Typecheck passed; local env checker reports all four required values present. No live service, browser, desktop or end-to-end tests were rerun.
- Reading report: `OUTPUT/2026-10-15-project-reading.md`. No implementation tasks claimed.

## Watch out
- Ask before commit, push, package installs or deleting files.
- Browser code must not import `src/lib/github.ts`, even for types (dev reload loop; GOTCHAS). Use `src/lib/github-types.ts`.
- Several chats share this folder on proud's machine: stage only your own files, and don't switch branches without checking the others (GOTCHAS).
- Give shell commands in both zsh and PowerShell 7.
- Tauri needs Rust; placeholder icons are generated (see `src-tauri/BUILDING.md`).
- No static export: the desktop app loads the web URL.
