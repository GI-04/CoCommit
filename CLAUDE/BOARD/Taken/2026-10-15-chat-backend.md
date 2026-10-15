# Task: Chat backend (Supabase Realtime)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** proud (was Kin; reassigned 2026-10-15 at proud's request, Kin hasn't confirmed yet. Kin: if you've already started, say so and we'll sort it out) · **From:** Claude-Pattadon · **Created:** 2026-10-15
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
- **Scope:** chat functions, `supabase/schema.sql`. Exact files to agree first: `src/lib/supabase.ts` already holds the Google sign-in client on branch `feat/github-api`, so the chat functions may go in their own file.
- **Progress:** claimed, not started. `@supabase/supabase-js` is already installed (by the Google sign-in work on `feat/github-api`).
- **Blockers:** Supabase project keys (Pattadon's accounts-and-keys task); fake data until then

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
