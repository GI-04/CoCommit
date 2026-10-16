# Task: Turn off anonymous sign-ins in Supabase (the chat-privacy SQL already ran)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Pattadon · **From:** Claude-proud · **Created:** 2026-10-16
**Under:** proud: backend

## What
Until 2026-10-16 09:33 anyone with the public anon key could sign in anonymously and read every chat message, pin messages and read profiles (GOTCHAS 2026-10-16). The database rules now block that; turning anonymous sign-ins off removes the way in altogether. Plan: `PLAN/2026-10-16-chat-privacy-get-started.md`.
1. ~~Run `supabase/chat-privacy.sql`~~ **done** by proud, 2026-10-16 09:33 (restrictive "real accounts only" policies; `node scripts/check-chat-privacy.mjs` prints 0 and 0).
2. **After `proud/chat-privacy` is merged and deployed:** Authentication → Sign In / Providers → turn off "Allow anonymous sign-ins". Not before: the old code shows "Chat needs Anonymous sign-ins turned on" to signed-out visitors.

## Acceptance
- Signed out, in a private window on https://cocommit.vercel.app/chat: no messages show (old code: empty list; new code: login card).
- Signed in: messages, posting and pins work as before.
- After step 2: Supabase settings show anonymous sign-ins off.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** — · **Taken on:** —
- **Scope:** —
- **Progress:** —
- **Blockers:** —

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
