# Task: Chat backend (Supabase Realtime)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** proud (was Kin; reassigned 2026-10-15 at proud's request, confirmed by Kin in dcc7463) · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
Real-time chat, one channel per repo. Install `@supabase/supabase-js` only after asking Pattadon.
- Supabase table `messages` (id, repo, author, text, kind: `text` | `git_event`, pinned, created_at); save the SQL in `supabase/schema.sql`
- `src/lib/supabase.ts`, exporting: `sendMessage(repo, text)`, `subscribe(repo, onMessage)`, `postGitEvent(repo, summary)`, `pinMessage(id)` and `onlineUsers(repo)` (Realtime presence)

Part of `CLAUDE/PLAN/2026-10-15-demo-scope.md` (deadline **2026-10-16 11:30**). Work on your own branch and merge by PR.

## Acceptance
- Two browsers on the same repo see each other's messages instantly.
- A commit made through the git buttons shows up in chat as a git event.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** proud (work by Claude-proud) · **Taken on:** 2026-10-15
- **Scope:** `supabase/schema.sql`, `src/lib/chat.ts` (instead of `src/lib/supabase.ts`, which is now the shared client from Google sign-in), git events from `src/lib/github-client.ts`, and wiring `src/app/chat/page.tsx` (option A in the plan; Trin told). Plan: `PLAN/2026-10-15-chat-backend.md`.
- **Progress:** plan approved (active). Branch `feat/chat-backend` (from `feat/github-api`, `main` merged in as 1fd522d). Built `supabase/schema.sql`, `src/lib/chat.ts` (fake mode: localStorage + BroadcastChannel), git events in `github-client.ts`, wired `/chat`. Verified 2026-10-15: typecheck clean; in the browser (fake mode, two tabs) messages appear in the other tab at once, pin syncs, "Online (2)", history survives a reload, a git event from another tab renders, no console or server errors. Not verified: Supabase for real (no keys, `schema.sql` not run yet); the `github-client` → git event hook (no screen calls `github-client` yet). Trin told: `Pending/2026-10-15-review-chat-screen.md`. Not committed.
- **Blockers:** Supabase project keys (Pattadon's accounts-and-keys task); fake data until then

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
