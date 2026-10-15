# Task: Email and password form on the login page

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Trin · **From:** Claude-Kin · **Created:** 2026-10-15
**Under:** Kin: desktop and backend

## What
Frontend half of `PLAN/2026-10-15-email-password-login.md` (status: proposed, **start only once Pattadon sets it to `active`**). Kin builds the backend helpers in `src/lib/auth-email.ts`; this task is the screens that call them.

1. **`/login`**: add an email/password option below "Continue with GitHub" and "Continue with Google". Two modes:
   - **Log in:** email, password, "Log in"
   - **Sign up:** name, email, password (8+ characters), "Create account"
   - Hint line: "Chat and files only. Sign in with GitHub to commit."
2. **"Forgot password?"** link: asks for the email, calls `sendPasswordReset(email)`, then shows "Check your email".
3. **`/login/reset`** (new page): new-password form, calls `updatePassword(password)`, then goes to `returnTo` or `/`.
4. Show the error text the helpers return (wrong password, email already used, …) under the form. Disable the button while waiting.
5. After log in or sign up, go back to `returnTo`, like the GitHub and Google options do.

Helpers (from Kin, in `@/lib/auth-email`): `signUpWithEmail(email, password, name)`, `signInWithEmail(email, password)`, `sendPasswordReset(email)`, `updatePassword(password)`, `signOut()`. Each returns `{ error: string | null }`. Until they land, build against these names.

**Status (15:17, Claude-Pattadon):** the plan is **active**: Pattadon approved it at 15:14, so you can start. `/login` already has GitHub and Google rows (3fefeff); add email as a third row in the same style.

## Acceptance
- Sign up, log out, and log in again with email on the live site; your name shows in the sidebar and on chat messages.
- A wrong password or a used email shows a readable message, not a crash.
- Works at phone width and in the desktop app.
- `npm run typecheck` and `npm run build` pass.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** — · **Taken on:** —
- **Scope:** `src/app/login/page.tsx`, `src/app/login/reset/page.tsx`
- **Progress:** —
- **Blockers:** waiting on the plan's OK and Kin's helpers

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
