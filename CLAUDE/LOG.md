# Log

<!-- Meaningful events only, newest on top, one line each: a milestone, a release, a task finished, a plan accepted, an incident. Not a diary of every edit. -->

- 2026-10-15 · Claude-Pattadon — Landing page at `/` (commit-graph rail, clickable hero demo); app home moved to `/home`; typecheck, 16 tests, route loop and browser checks pass; not committed or deployed
- 2026-10-15 · Claude-proud — Backend polish (branch `feat/backend-polish`): COCOMMIT/ for this repo, git-event links, chat-author.sql (tested on local Postgres), demo script, docs/API.md
- 2026-10-15 · Claude-Kin — Local git Rust side done on branch kin/local-git-rust: 12 commands + guards, folder picker plugin, live-site-only permission (localhost in dev builds only); tested in tauri dev and release
- 2026-10-15 · Codex-Pattadon — Pushed profile via merge-only integration to main (d245b86), deployed to production; live /profile and real GitHub session config verified; previous deployment retained for rollback

- 2026-10-15 · Codex-Pattadon — Added account profile/settings page, sidebar access, fresh chat names and mobile navigation; typecheck, Webpack build and 16 controlled tests pass; signed-out browser checked at 390px/1280px

- 2026-10-15 · Codex-Pattadon — Read project source, configuration, SQL, plans and pointer-linked fixtures at 24137f0; typecheck passed; documented integration gaps and refreshed stale handoff/LIB notes

- 2026-10-15 · Claude-Kin — Desktop app: commit works from the installed Windows app; new-window links ("View on GitHub") now open in the system browser (branch kin/desktop-open-links)
- 2026-10-15 · Claude-Pattadon — Repo page Local mode (web side): local-git.ts, status parser, LocalRepo screen; tested with real git through a Node bridge; waits on Kin's Rust commands
- 2026-10-15 · Claude-Pattadon — Local git plan approved (desktop app: staged/unstaged/untracked, stage/commit/pull/push); Kin does Rust, Claude-Pattadon the web side
- 2026-10-15 · Codex-proud — Resumed chat-pins: implementation present; typecheck and production build pass; completed handoff, real GitHub save still unverified.
- 2026-10-15 · Claude-Pattadon — Repo screen wired to the real git API (edit file → commit / new branch → open PR); tested in fake and signed-out modes
- 2026-10-15 · Claude-Kin — GitHub sign-in works in the installed Windows desktop app and survives a restart (login-backend part 7; macOS still to test)
- 2026-10-15 · Claude-Kin — Email/password login backend (`src/lib/auth-email.ts`, `src/lib/permissions.ts`) on branch kin/email-login; waits on Supabase Email settings to test for real
- 2026-10-15 · Claude-Pattadon — src/lib/workspace.ts (load/save COCOMMIT/ through GitHub + refreshLog) built and tested end to end on branch workspace-sync
- 2026-10-15 · Claude-Pattadon — Board refresh: chat-screen-crash moved to Done; status notes on 6 Pending tasks
- 2026-10-15 · Claude-proud — Google login works on the live site (Supabase `google: true`; proud logged in); task google-login-setup Done
- 2026-10-15 · Claude-Pattadon — Pattadon approved Kin's email/password login plan (PLAN/2026-10-15-email-password-login.md is active)
- 2026-10-15 · Claude-proud — Rename task Done: tiramisucake0127 → proud / Claude-proud (COLLAB, local inbox)
- 2026-10-15 · Claude-proud — PR #5 merged: activity feed for COCOMMIT/LOG.md (`listCommits`, `listMergedPulls`, `listPinned`)
- 2026-10-15 · Claude-proud — Recent activity feed (`listCommits`, `listPinned`) built and tested on `feat/recent-activity`; note left for Claude-Pattadon
- 2026-10-15 · Claude-Pattadon — PR #4 (GitHub API + chat backend) tested against real Supabase, merged and deployed; live chat works
- 2026-10-15 · Claude-Pattadon — Context workspace plan approved; src/lib/context.ts rewritten as a COCOMMIT/ workspace (branch context-workspace)
- 2026-10-15 · Claude-proud — PR #4 fixed per Pattadon: no Google login wall, chat via anonymous Supabase sign-in + GitHub name, dev reload loop fixed; typecheck + build pass
- 2026-10-15 · Claude-proud — Opened PR #4 (`feat/chat-backend` → `main`: git API + Google sign-in + chat)
- 2026-10-15 · Claude-Pattadon — Supabase project created; URL + anon key added to Vercel Production and redeployed
- 2026-10-15 · Claude-Kin — Kin confirms chat-backend reassignment to proud (757491c); Kin keeps desktop-builds only
- 2026-10-15 · Claude-proud — Chat backend built on `feat/chat-backend` (schema.sql, chat.ts, /chat wired); two-tab fake mode tested; real Supabase waits for keys
- 2026-10-15 · Claude-proud — Took chat-backend (reassigned from Kin at proud's request); plan active on branch `feat/chat-backend`
- 2026-10-15 · Claude-proud — GitHub sign-in + git-button API built on `feat/github-api` (fake mode + mock-GitHub tested; commit 7858f94, pushed; real test waits for OAuth keys)
- 2026-10-15 · Claude-Pattadon — Google sign-in (Supabase Auth) built in demo-safe mode; needs Supabase/Google keys to go live
- 2026-10-15 · Claude-Pattadon — First deploy: https://cocommit.vercel.app (Vercel CLI, fake mode, no keys yet)
- 2026-10-15 · Claude-Pattadon — Accounts-and-keys setup guide + scripts/check-env.mjs written (Pattadon creates the accounts)
- 2026-10-15 · Claude-Kin — First Windows desktop build (.msi + setup .exe) on branch kin/desktop-builds; app loads a URL, no static export
- 2026-10-15 · Claude-Pattadon — COCOMMIT.md format and src/lib/context.ts written and tested (branch ai-context-sharing)
- 2026-10-15 · Claude-Pattadon — Frontend task released to Trin; partial screens on branch layout-and-screens
- 2026-10-15 · Claude-Pattadon — Demo scope approved (24 h, ends 2026-10-16 11:30); 6 board tasks posted
- 2026-10-15 · Claude — Emptied skeleton code files (structure only); configs kept
- 2026-10-15 · Claude — Stack plan approved; wrote project skeleton (Next.js + Tauri), not installed yet
- 2026-10-15 · Claude — Proposed tech stack (PLAN/2026-10-15-stack.md)
- 2026-10-15 · Claude — Adopted CLAUDE/ workspace via /initiate-team
- 2026-10-15 · Claude — Reset local main to match GitHub (unrelated "first commit" histories); old commit kept on branch backup/local-main-before-reset
