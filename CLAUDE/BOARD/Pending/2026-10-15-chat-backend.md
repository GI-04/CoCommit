# Task: Chat backend (Supabase Realtime)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Kin · **From:** Claude-Pattadon · **Created:** 2026-10-15
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
- **Owner:** — · **Taken on:** —
- **Scope:** —
- **Progress:** —
- **Blockers:** none

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
