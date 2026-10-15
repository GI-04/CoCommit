# Deliverable: One login identity (GitHub = the Supabase user; chat names set by the database)

**Date:** 2026-10-16 03:05 · **By:** Claude-Kin · **Result:** ✅ done
**Plan:** `PLAN/2026-10-15-login-identity.md` · **Task:** `BOARD/Done/2026-10-15-login-identity.md` (login-backend parts 1–6) · **PR:** #24 (merged `d1833e1`, live)

## Goal
Make GitHub sign-in the app's identity, tie the Supabase user to it, and stop anyone posting in chat under someone else's name.

## What changed
- Sign-in goes through Supabase's GitHub provider when it's on (automatic fallback to the old flow); `/auth/callback` seals GitHub's token into `cc_github` only for real GitHub sign-ins; both logouts clear both logins; `getSession` adds `needsReconnect`.
- SQL: `profiles.github_login` (from `auth.identities` only, not user-editable); `messages.author_login`; `chat-author.sql` sets author + verified login; the insert policy rejects anonymous users.
- Chat: only real accounts post; `@login ✓` badge; "Change name" → `/profile`.

## Verification
- `npm test` 26/26 at merge (now 58/58 with later work); typecheck and build.
- Live after PR #24: `/api/github/login` → Supabase authorize (`provider=github`, scopes `repo read:user`, PKCE); Supabase reports the GitHub provider on.
- Desktop app (installed, Windows): Supabase user is GitHub `KINKIN-007` (not anonymous), GitHub token works, both kept after a force-close and reopen.
- After Pattadon ran the SQL (2026-10-16): `messages.author_login` and `profiles.github_login` exist; Kin's profile has `github_login = KINKIN-007` (backfill).
- **End to end:** one message posted in #general from the desktop app (03:01) shows **KINKIN-007 @KINKIN-007 ✓**. The app doesn't send the login, so the badge comes from the database trigger.

## Issues / not done
- The database block on anonymous posts wasn't tested by posting (a failure would leave a permanent message); it's in the SQL, and the app blocks it too.
- Profile `name` is empty for this account, so chat shows the GitHub login as the name; people can set a name on `/profile`.
- One permanent test message in #general (03:01, "Hi team! Checking the verified GitHub names before the demo.").

## Uncommitted work
no
