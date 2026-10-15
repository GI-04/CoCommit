# Plan: Email and password sign-up / log in

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **Superseded by:** —
**Proposed by:** Kin (with Claude-Kin) · **Approved by:** Pattadon (2026-10-15 15:14)

## Why
Give users more ways in. Not everyone has a GitHub or Google account they want to use, and a normal email + password sign-up is what most people expect. GitHub stays the recommended login, because commits and pull requests need it.

## Approach
Email/password is a third option on `/login`, next to GitHub and Google. It uses Supabase Auth's built-in email provider, so it shares the session, `profiles` row and chat rules that Google already uses. No new packages.

**What an email user can do:** chat, and upload files once Files exists. **Not:** commit, open PRs or edit the context. Those need a GitHub sign-in (they can still add GitHub later from the same login page).

1. **Supabase settings (Pattadon, dashboard):** Email provider on; minimum password length 8. Turn **Confirm email** off for the demo: the built-in sender only allows a few emails per hour. Turn it back on once real SMTP is set. Add `https://cocommit.vercel.app/auth/*` and `http://localhost:3000/auth/*` to the redirect allow-list.
2. **Backend (Kin):** `src/lib/auth-email.ts`, browser helpers with plain-language errors (wrong password, email already used, weak password, too many tries):
   - `signUpWithEmail(email, password, name)`: stores `name` as `full_name`, so the existing `profiles` trigger and chat (`chat.ts` `myName`) pick it up
   - `signInWithEmail(email, password)`
   - `sendPasswordReset(email)`: link back to `/auth/callback?next=/login/reset`
   - `updatePassword(newPassword)`: for the reset page
   - `signOut()`
   - Confirm and reset links reuse `src/app/auth/callback/route.ts` (code exchange).
3. **Permissions (Kin):** a helper `canUseGit()` and server checks so email users get a clear "Sign in with GitHub to commit" message instead of an error. Chat insert policy stays `author_id = auth.uid()`. Make it require a non-anonymous user once login is required. When Files is built, its storage policy allows `authenticated`, non-anonymous users.
4. **Frontend (Trin):** an email/password form on `/login` (sign up and log in tabs, name field on sign-up), a "Forgot password?" link, and a `/login/reset` page with a new-password form. It calls only the helpers above. Board task: `BOARD/Pending/2026-10-15-email-login-frontend.md`.
5. **Profiles:** `supabase/profiles.sql` already fills `name` from `full_name`; with no name it now uses the part of the email before the @.

**Changes while building (Claude-Kin, 2026-10-15):**
- No `email` column in `profiles` after all: every signed-in user, anonymous chat users included, can read that table, so it would expose everyone's email. The name fallback covers display.
- `signUpWithEmail(email, password, name, returnTo?)` returns `{ error, needsConfirmation }`. `needsConfirmation` is true when Supabase's Confirm email is on; the screen should say "Check your email" instead of signing in.
- `signOut()` clears the Supabase session and the GitHub cookie (login-backend part 5).
- `src/lib/permissions.ts`: `getPermissions()` → `{ via, chat, files, git }`, `canUseGit()`, and the messages `NEEDS_GITHUB` / `NEEDS_LOGIN` for the screens.

## Files touched
- `src/lib/auth-email.ts`: new, email auth helpers (Kin)
- `src/app/auth/callback/route.ts`: confirm/reset links land here (check only)
- `supabase/profiles.sql`: name falls back to the email's first part; policies re-runnable (Kin)
- `src/lib/permissions.ts`: new, who may chat / upload / use git (Kin)
- `src/app/login/page.tsx`, `src/app/login/reset/page.tsx`: form and reset page (Trin)

## Risks / needs OK
- **Changes the login direction.** The login-backend task makes GitHub "the app's login". This keeps GitHub as the recommended option and adds email/password beside it. Pattadon to confirm.
- Ties in with login-backend part 9 (keep or drop Google): this plan assumes the login page keeps several options.
- Email confirmation off means anyone can sign up with an email they don't own. That's fine for the demo; turn it on after.
- File uploads are out of the demo scope (`PLAN/2026-10-15-demo-scope.md`). This only sets who may upload once Files is built.

## How we'll verify
- On localhost and https://cocommit.vercel.app: sign up with email → land signed in, name shown in the sidebar and on chat messages.
- Log out → log in again with the same password; a wrong password shows a friendly error.
- Forgot password → email link → set a new password → log in with it (needs Confirm/SMTP settings; check once).
- An email user sees "Sign in with GitHub to commit" on Repo, not an error.
- `npm run typecheck` and `npm run build` pass.
