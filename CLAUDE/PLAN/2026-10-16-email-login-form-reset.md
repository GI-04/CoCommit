# Plan: Email sign-in form, "Forgot password?" link and /login/reset page

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**Proposed by:** Claude-Trin (for Trin) · **Approved by:** Trin (2026-10-16, in chat: "Yes: build /login/reset and add the email sign-in form with a Forgot password? link")

## Why
`src/lib/auth-email.ts` already has `signInWithEmail`, `signUpWithEmail`, `sendPasswordReset` and `updatePassword`, but nothing calls them: `/login` shows only GitHub and Google, so there is no way to log in with email and the reset email links to a `/login/reset` page that doesn't exist (404). This is the frontend half of `PLAN/2026-10-15-email-password-login.md` (active), i.e. board task `2026-10-15-email-login-frontend` addressed to Trin. `/login/forgot` is already built (same day).

## Approach
Match the existing `/login` card style (Tailwind tokens, `Button` from `@/components/ui`); the Figma redesign is not adopted in the code yet. No new packages. Copy comes from the Figma Auth frames ("Welcome back.", "Create an account.", "Forgot password?").
1. **`src/components/EmailLogin.tsx` (new):** "Log in" / "Sign up" modes. Log in = email + password + "Forgot password?" link to `/login/forgot`; Sign up = name + email + password (8+). Shows the helper's error text, disables the button while waiting, and shows "Check your email" when `signUpWithEmail` returns `needsConfirmation`. On success goes to `returnTo` (full page load so the new session is picked up). Hint: "Chat and files only. Sign in with GitHub to commit." Shown disabled ("Not set up yet") when Supabase isn't configured, like the other options.
2. **`src/app/login/page.tsx`:** render `<EmailLogin returnTo=… />` under the GitHub and Google rows, behind an "or" divider; the demo-mode note still covers "nothing set up".
3. **`src/app/login/reset/page.tsx` (new):** new password + confirm; calls `updatePassword`; shows "Password updated" with a Continue link to `/home`. A missing or expired session shows the helper's "This reset link has expired. Ask for a new one." plus a link to `/login/forgot`.
4. **Not changing:** `auth-email.ts`, `permissions.ts`, Supabase settings (Pattadon's), `/auth/callback`.

## Files touched
- `src/components/EmailLogin.tsx`: new
- `src/app/login/page.tsx`: add the email option
- `src/app/login/reset/page.tsx`: new
- `src/proxy.ts`: already allows `/login/forgot` (done); `/login/reset` needs a signed-in session, so it stays behind the wall
- `CLAUDE/LIB/knowledge/general/email-login.md`, `BOARD/`, `LOG.md`, `HANDOFF.md`: notes

## Risks / needs OK
- No Supabase keys on this machine, so a real sign-up/sign-in/reset can't be tried here: the forms are checked in the browser for states and errors only. A real run needs Supabase's Email provider on (it is, per HANDOFF) and the `/auth/*` redirect URLs (Pattadon's list). **Real email sending is not triggered during testing.**
- Confirm email is off for the demo, so anyone can sign up with an address they don't own (already accepted in the parent plan).

## How we'll verify
- `npm run typecheck`, `npm test`, `npm run build`.
- In the browser (no keys): `/login` shows the email option as "Not set up yet"; `/login/forgot` and `/login/reset` render and show readable errors; phone width has no horizontal scroll.
- Once keys are set (Trin or Pattadon): sign up → log out → log in; wrong password shows a friendly message; forgot password → email link → `/login/reset` → new password works.
