# Handoff

**Last updated:** 2026-10-16 03:30 · **By:** Claude-proud (Tasks board PR #30 open, not merged); before that Claude-Pattadon (LiveKit calls merged and live); earlier notes kept

## Current state
> **Notice from Pattadon (until 2026-10-16 03:00 UTC+7):** only destructive plans need Pattadon's review. Everything else, including your ask-first list with your own user, is unchanged. Details: `DECISIONS.md`, top entry.
- **Desktop on macOS (checked by Claude-proud, 23:40):** after PR #19 the installed-style app works: folder picker, git status/remote/diff and Refresh in Local folder mode; GitHub login survives a restart. Stage/commit/pull/push not tried (would change the team repo).

Demo scope is active (`PLAN/2026-10-15-demo-scope.md`, ends **2026-10-16 11:30**). Agents are named `<Agent>-<Owner>`; tiramisucake0127 is now **proud** (Claude-proud); rename task Done.
- **Live site: https://cocommit.vercel.app** (Vercel team `gi-04`, project `cocommit`). Every push to `main` auto-deploys (GitHub Actions; see "Auto-deploy" below and LIB `deploy`).
- **On `main`:** PR #4 (git API, Google sign-in switched off, real chat; Supabase set up with anonymous sign-ins and both SQL files) and PR #5 (activity feed `listCommits` / `listMergedPulls` / `listPinned` for `COCOMMIT/LOG.md`, plus `commitFilesQuietly`). **GitHub OAuth keys are live** (`getSession` → `"fake":false`). The sidebar has a "Log in" button → `/login` (GitHub recommended; Google availability is read from Supabase). Google sign-in is on in Supabase (`OUTPUT/2026-10-15-1530-google-login.md`; live settings rechecked 2026-10-15 23:45: Google, Email and anonymous sign-ins all enabled).
- **AI context = `COCOMMIT/` team workspace** (`PLAN/2026-10-15-context-workspace.md`). The load/save layer and activity refresh already exist in `src/lib/workspace.ts`; the feed task is in `BOARD/Done/`. The Context screen still uses mock data and needs wiring.
- Desktop (Kin): the Tauri app loads the live site; new-window links open in the system browser (PR #9); GitHub sign-in and commit work in the installed Windows app. Local folder mode works in the desktop app (Rust side merged, PR #11). Installers build on GitHub Actions for macOS and Windows (PR #7, #12), and the site's download button hosts both, rebuilt from `main` after PR #11 (PR #15, live since the `af8f164` deploy). Desktop tasks are **Done** (Windows + macOS tested; report `OUTPUT/2026-10-16-0000-desktop-app.md`). Details: LIB `desktop-app`, `local-git`.
- **Chat names (PR #10, merged):** "Change name" in chat lets guests pick a display name. With `supabase/chat-author.sql` run (PR #16), a poster with a profile name always posts under it and a guest using a member's name gets " (guest)".
- Chat test messages ("Guest 330", "[test by Claude-proud]") deleted from `messages` by Pattadon in the Supabase SQL Editor (2026-10-16).

## Tasks board (2026-10-16 03:30, Claude-proud): PR #30 open, not merged
Plan `PLAN/2026-10-16-tasks-board.md` (active, approved by proud). `/tasks` is now a Pending / Taken / Done board over the current repo's `COCOMMIT/BOARD/` task files: **New task**, **Take**, **Done** (also a `LOG.md` line) and **Release**, one commit each. New: `src/lib/tasks-text.ts`, `src/lib/tasks.ts`, `tests/tasks.test.mjs`; changed: `src/app/tasks/page.tsx`, `src/lib/sections.ts` (Tasks in the main nav), the LIB mock GitHub, docs. Verified: typecheck, `npm test` 65/65, build, and a browser run against the stateful mock GitHub (report `OUTPUT/2026-10-16-0315-tasks-board.md`, LIB `tasks-board`). **Not verified:** real GitHub. **Where:** branch `proud/tasks-board` in the worktree `.claude/worktrees/proud-tasks-board` (proud's machine; its own `node_modules` from `npm ci`); the main folder stays on `main`. `.claude/worktrees/` is git-ignored only in this machine's `.git/info/exclude`. **PR:** https://github.com/GI-04/CoCommit/pull/30 (latest `main` merged in, checks rerun). **Next:** review and merge before the 09:30 freeze (merging deploys); then one real task on `GI-04/CoCommit`; tell Pattadon (demo scope now includes the task board) and Trin (new page in the UI area). Also: the main folder's `node_modules` lacks the LiveKit packages; run `npm ci` there before building `main` locally.

## Calls with LiveKit (2026-10-16, Claude-Pattadon): merged and live
`/calls` → **Join call** runs a LiveKit call (voice, video, screen share) inside CoCommit: one room per repo, signed-in people only. PR #26 merged as `ac7e87a`; deploy run `38789668599` passed. Live checks: `/calls` 200; `POST /api/livekit-token` signed out → 401 "Log in to join the call." (so the keys are set). The three `LIVEKIT_*` keys are in Vercel Production and in `.env.local` (main checkout). Pattadon tested mic and camera in Safari locally. Details: LIB `calls`, report `OUTPUT/2026-10-16-0130-livekit-calls.md`. **Next:**
1. A signed-in call on the live site with two people.
2. Rebuild the desktop installers so the macOS app gets camera/mic access (`src-tauri/Info.plist`).
3. Optional: per-team room access; the call uses the same fixed repo as chat for now.
Also: `proud/file-bot` (PR #25) had docs-only conflicts with main; they're resolved in `6968f14` and the PR is mergeable.

## Landing page (2026-10-15, Claude-Pattadon): merged and live
`/` is the landing page (no sidebar); the app home is `/home` (LIB `landing-page`). PR #14 merged (`7bcca02`) and deployed to production: `dpl_jXkpb26snya48KinrcfpW1obxHD9` (`https://cocommit-3nxhnank1-gi-04.vercel.app`). This deploy also put PRs #11–#13 live (Windows installer download, desktop local-git support). Live checks: `/`, `/home`, `/repo`, `/chat`, `/login`, the manifest and the Windows installer all return 200; `/home` has the sidebar; `getSession` → `"fake":false`; no console errors on `/`. Rollback target: `https://cocommit-p0yrxcans-gi-04.vercel.app` (`dpl_3HHFkzN1jVRQrTSABXhFVYuozeCy`). Deployed from a `git archive` export of `main` because `.claude/worktrees/` (418 MB) sits in the repo folder and there's no `.vercelignore`. **Next:** open the installed desktop app once to confirm it lands on `/home`. Any new "go home" link should use `/home`.

## Auto-deploy (2026-10-15, Claude-Pattadon): live
Every push to `main` now deploys automatically (`.github/workflows/deploy-vercel.yml`, LIB `deploy`). PR #18 was merged as `ef48941`. Its first run passed and deployed `https://cocommit-8igqdiwz1-gi-04.vercel.app` (`dpl_EAXDsUyazHKEn6oNUd7BqwQM5Lym`); the live routes and `getSession` (`"fake":false`) were checked. Rollback target: `https://cocommit-fs44ytgrn-gi-04.vercel.app`. **Next:**
1. Watch the first teammate-authored merge to `main`: does Hobby block it?
2. **Demo:** set `AUTO_DEPLOY=off` before about 09:00 on 2026-10-16, or don't merge to `main` during the demo.
3. Pattadon: the `Production` environment shows no main-only branch rule in GitHub's API; recheck it, or revoke the token after the hackathon.
4. The docs update (README, CLAUDE.md/AGENTS.md, PROJECT.md, LIB, GOTCHAS) is in a PR from `claude/vercel-auto-deploy-53b5dd` (docs only, so merging it does not deploy).

## Latest deploy (2026-10-15 22:03, Claude-Pattadon)
`main` at `3d2a5f3` is live: `dpl_HCMXbH7WtTZnL5RMCSPGWMYMSPLn` (`https://cocommit-fs44ytgrn-gi-04.vercel.app`), deployed from a `git archive` export. New in it: the sidebar CoCommit logo links to the landing page `/`, and a sidebar **Home** item links to `/home`. Before that, `af8f164` (PRs #10, #15, #16) went live at 21:56. Live checks: `/`, `/home`, `/repo`, `/chat`, `/login`, `/profile`, `/context`, the manifest and both installers return 200; `getSession` → `"fake":false`; on the live site, logo from `/repo` → landing page, Home from `/chat` → `/home`, no console errors. Rollback target: `https://cocommit-gqdlwx4yn-gi-04.vercel.app` (`dpl_BRCuARDXcBX77uzmbEoS3QfkAcww`).

## Chat pins handoff (2026-10-15, Codex-proud)
Merged into main and live (`af8f164` deploy): `src/lib/chat-pins.ts` and Decision/Gotcha forms in `/chat`. Approved plan: `PLAN/2026-10-15-chat-pins.md`. Previous browser checks cover both forms, cancel, signed-out and missing-workspace cases; typecheck and production build passed again this session. Real GitHub saving has not been tested. Next: production deploy by the teammate with Vercel access, then verify real GitHub saving; coordinate page changes through Trin's review task.

## @cocommit bot (2026-10-16, Claude-proud): built, not committed
Plan `PLAN/2026-10-15-file-bot.md` (active, approved by proud). In chat, `@cocommit <question>` asks Claude (`claude-haiku-5-5`, plain fetch) to search and summarize `COCOMMIT/`; the reply is private until **Share to chat**. New: `src/lib/bot.ts`, `bot-tools.ts`, `bot-client.ts`, `src/app/api/bot/route.ts`, `tests/bot*.test.mjs`; changed: `src/lib/github.ts` (+`listFolderFiles`, `listFileCommits`), `src/app/chat/page.tsx` (Trin's area: bot replies, multi-line messages), `.env.example`, `README.md`, `scripts/check-env.mjs`. Verified: typecheck, `npm test` (all pass, incl. an offline route test with a fake Claude), `npm run build`, and in the browser the "not set up" reply and empty-question hint. **Not verified:** a real answer (no `ANTHROPIC_API_KEY` locally). **Next:** proud decides on commit/branch/PR; add `ANTHROPIC_API_KEY` to `.env.local` and Vercel (Pattadon); ask a real question; Trin to glance at the chat change. Demo code freeze 09:30: keep it off `main` if not tested by then. LIB `file-bot`.

## Exact next step
0. Profile is live at `https://cocommit.vercel.app/profile`: source commit `d245b86` (profile commit `c0c7b94`, merged with desktop and chat-actions updates; no rebase/force push). Vercel deployment `dpl_5Zp6oE1uLzTTtErQykPJkPgNuvVK`, `https://cocommit-4frfib617-gi-04.vercel.app`. Production Turbopack build passed; live signed-out page loads with no console errors; GitHub session API returns `fake:false`. Next: verify profile edits with a real signed-in test account. Rollback target before this release: `https://cocommit-l66vm0d6k-gi-04.vercel.app`. See `OUTPUT/2026-10-15-account-profile.md`.
1. proud: declined the login-backend task. PR #16 (merged and live since the `af8f164` deploy): this repo's `COCOMMIT/` workspace, git-event links, `supabase/chat-author.sql`, demo script `OUTPUT/2026-10-15-2145-demo-script.md`, `docs/API.md`. `chat-author.sql` is live on Supabase (verified 23:00: guests using a member's name get " (guest)"). Next: rehearse with the demo script. Live test done 22:15: commit + git event with link work; `github-git-buttons` and `chat-backend` are Done. New-branch base fix (PR #17) and the dev reload fix (PR #19) are merged.
2. Context frontend owner (Trin): wire the tabbed Context screen and setup flow to the existing `src/lib/workspace.ts` helpers; no new load/save layer is needed.
3. Trin: login frontend, `wire-screens-to-github`, `review-chat-screen`, the tabbed Context screen.
4. Pattadon: dev OAuth app for localhost (login-backend part 8); decide on Google (part 9).
5. Email/password login (`PLAN/2026-10-15-email-password-login.md`, active): Kin's backend is merged (PR #6: `src/lib/auth-email.ts`, `src/lib/permissions.ts`). Supabase side done: Email provider on and Confirm email off (live `/auth/v1/settings` checked 2026-10-15 23:45: `email: true`, `mailer_autoconfirm: true`); per Pattadon, Redirect URLs added and `profiles.sql` re-run. Trin: the form (`BOARD/Pending/2026-10-15-email-login-frontend.md`); `signUpWithEmail` also returns `needsConfirmation`.

## Repository reading (2026-10-15)
- Source inspected at `24137f0`: GitHub Repo UI and chat implemented; chat still selects the fixed mock repo; Context UI remains mock; email/reset UI absent.
- Local git TypeScript UI/bridge exists on `main`; the Rust commands, dialog plugin and remote IPC capability are merged too (Kin, PR #11), so Local mode works in the desktop app.
- Typecheck passed; local env checker reports all four required values present. No live service, browser, desktop or end-to-end tests were rerun.
- Reading report: `OUTPUT/2026-10-15-project-reading.md`. No implementation tasks claimed.

## Watch out
- Ask before commit, push, package installs or deleting files.
- Browser code must not import `src/lib/github.ts`, even for types (dev reload loop; GOTCHAS). Use `src/lib/github-types.ts`.
- Several chats share this folder on proud's machine: stage only your own files, and don't switch branches without checking the others (GOTCHAS).
- Give shell commands in both zsh and PowerShell 7.
- Tauri needs Rust; placeholder icons are generated (see `src-tauri/BUILDING.md`).
- No static export: the desktop app loads the web URL.
