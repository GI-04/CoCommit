# Email/password login and permissions (auth-email.ts, permissions.ts)

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
Email/password is a third login next to GitHub and Google, on Supabase Auth (`PLAN/2026-10-15-email-password-login.md`, active). Email and Google users can chat (and upload files, once Files exists); git actions need a GitHub sign-in. Browser helpers never throw: each returns `{ error }` with a plain-language message for the screen.

## Details
- **`src/lib/auth-email.ts` (browser):** `signUpWithEmail(email, password, name, returnTo?)` → `{ error, needsConfirmation }` (true when Supabase's Confirm email is on: show "Check your email"); `signInWithEmail`; `sendPasswordReset(email)` (link → `/auth/callback?next=/login/reset`); `updatePassword(password)` (needs a signed-in, non-anonymous session); `signOut()` (clears the Supabase session **and** the GitHub cookie); `friendly(error)` maps Supabase codes (`invalid_credentials`, `user_already_exists`, `weak_password`, rate limits, offline, …). Minimum password length `MIN_PASSWORD_LENGTH` = 8. The name is stored as `full_name`, which the profiles trigger, chat and the sidebar read.
- **`src/lib/permissions.ts` (browser):** `getPermissions()` → `{ via: "github" | "email" | "google" | null, chat, files, git }` (a Supabase GitHub sign-in counts as `github`); `canUseGit()`; messages `NEEDS_GITHUB`, `NEEDS_LOGIN`. Anonymous chat users count as signed out. In fake mode (no GitHub keys), `git` is true so the screens work on sample data. The server still enforces it: git actions return 401 without the GitHub cookie.
- **Profiles:** `supabase/profiles.sql` names the profile from `full_name`, else the part of the email before the @. There's deliberately **no email column**: every signed-in user, including anonymous chat users, can read `profiles`.
- **Screens (2026-10-16, Claude-Trin, `PLAN/2026-10-16-email-login-form-reset.md`):** `src/components/EmailLogin.tsx` (Log in / Sign up tabs, shown under the GitHub and Google rows on `/login`; success → `window.location.assign(returnTo)`; `needsConfirmation` → "Check your email"), `/login/forgot` (`sendPasswordReset`, then "Link sent"), `/login/reset` (`updatePassword`; expired link → "Send a new link"). `src/proxy.ts` lets `/login/forgot` through the login wall; `/login/reset` needs the signed-in session the email link creates (`/auth/callback?next=/login/reset`). Copy follows the Figma Auth frames; styling follows the existing `/login` card (the Figma look is not adopted in code).
- **Live check (2026-10-16):** the form is live (PR #39); Kin did a real sign-up, log-out and log-in on https://cocommit.vercel.app and reported all acceptance steps passed (`OUTPUT/2026-10-16-0925-email-login.md`). Not reported: the forgot-password email → `/login/reset` run. Supabase settings (Email provider on, Confirm email off for the demo, `/auth/*` redirect URLs) are done (Pattadon).
- **Tests:** 37 logic checks ran against a fake Supabase client (scratch script, not in the repo); `tests/profile.test.mjs` covers the profile side (`npm test`).

## Sources
- `PLAN/2026-10-16-email-login-form-reset.md`
- `PLAN/2026-10-15-email-password-login.md` (includes the "changes while building" notes)
- PR #6 on GI-04/CoCommit; PR #39 (screens)
- `OUTPUT/2026-10-16-0925-email-login.md`

**Last checked against sources:** 2026-10-16
