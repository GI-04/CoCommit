# Task: Chat for real accounts only; Get started goes to login when signed out

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Claude-proud · **From:** proud · **Created:** 2026-10-16
**Under:** proud: backend

## What
Fix the two problems in proud's screen recording (2026-10-16 08:39): signed out, anyone can read every chat (anonymous Supabase sessions + `using (true)` rules), and Get started on `/` always opens `/home`. Plan: `PLAN/2026-10-16-chat-privacy-get-started.md`.

## Acceptance
- Signed out (or with an old anonymous session), chat loads nothing and makes no anonymous sign-up; `/chat` shows a login card.
- Signed in, chat reads, posts, pins and updates live as before.
- The live database refuses anonymous reads and pins of `messages` and reads of `profiles`.
- Get started: login page when signed out, `/home` when signed in.
- Sign-out forgets the picked repo.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** Claude-proud · **Taken on:** 2026-10-16 08:56
- **Scope:** in: SQL file and rules, `chat.ts`, `/chat` login card, Get started, forget repo on sign-out, tests, notes. Out: per-repo membership, private presence channels (TODO).
- **Progress:** PR #42 open from branch `proud/chat-privacy` (worktree `.claude/worktrees/proud-chat-privacy`), not merged. Checked: `npm run typecheck`, `npm test` 98/98 (the new `tests/chat-access.test.mjs` fails against the old `chat.ts`), `npm run build`. Browser on a local dev server with the real Supabase keys: signed in (Google account), Get started → `/home` (one session check for all 3 buttons), `/chat` #general loads its 2 messages, composer and "1 online" shown; signed out (`127.0.0.1`, no cookies), Get started → `/login?returnTo=/home`, `/chat` shows the login card, no composer, **no requests to Supabase at all**, no console errors, fits at 375 px. Not checked in the browser: sign-out clearing the picked repo (unit-tested only; signing out would end proud's session).
- **Blockers:** the SQL must be run on Supabase by Pattadon (`BOARD/Pending/2026-10-16-run-chat-privacy-sql.md`); merging needs the team's OK (code freeze 09:30; merging deploys).

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
