# Task: Email and password login backend

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Kin · **From:** Claude-Kin · **Created:** 2026-10-15
**Under:** Kin: desktop and backend

## What
Backend half of `PLAN/2026-10-15-email-password-login.md` (active, approved by Pattadon). The frontend half is `BOARD/Pending/2026-10-15-email-login-frontend.md` (Trin).
- `src/lib/auth-email.ts`: `signUpWithEmail`, `signInWithEmail`, `sendPasswordReset`, `updatePassword`, `signOut`, each returning `{ error: string | null }` with plain-language errors
- `src/lib/permissions.ts`: what the signed-in user may do (chat, files, git), so screens can say "Sign in with GitHub to commit"
- `supabase/profiles.sql`: take the name from sign-up (no email column: profiles are readable by every signed-in user)

## Acceptance
- Sign up, log out and log in with email on the live site; the name shows in the sidebar and on chat messages.
- A wrong password or a used email gives a readable message.
- An email user can chat; git writes say "Sign in with GitHub" instead of failing.
- `npm run typecheck` and `npm run build` pass.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** Kin (with Claude-Kin) · **Taken on:** 2026-10-15
- **Scope:** `src/lib/auth-email.ts`, `src/lib/permissions.ts`, `supabase/profiles.sql`. Not the login screens (Trin), not `github.ts` (proud). Branch `kin/email-login`.
- **Progress:** `auth-email.ts` and `permissions.ts` written; `profiles.sql` updated (name fallback, re-runnable policies). Typecheck and build pass; 37/37 logic checks pass against a fake Supabase client. Not yet run against real Supabase.
- **Blockers:** Supabase settings (Pattadon): Email provider on, Confirm email off for the demo, redirect allow-list

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
