# Email/password login and permissions (auth-email.ts, permissions.ts)

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
Email/password is a third login next to GitHub and Google, on Supabase Auth (`PLAN/2026-10-15-email-password-login.md`, active). Email and Google users can chat (and upload files, once Files exists); git actions need a GitHub sign-in. Browser helpers never throw: each returns `{ error }` with a plain-language message for the screen.

## Details
- **`src/lib/auth-email.ts` (browser):** `signUpWithEmail(email, password, name, returnTo?)` → `{ error, needsConfirmation }` (true when Supabase's Confirm email is on: show "Check your email"); `signInWithEmail`; `sendPasswordReset(email)` (link → `/auth/callback?next=/login/reset`); `updatePassword(password)` (needs a signed-in, non-anonymous session); `signOut()` (clears the Supabase session **and** the GitHub cookie); `friendly(error)` maps Supabase codes (`invalid_credentials`, `user_already_exists`, `weak_password`, rate limits, offline, …). Minimum password length `MIN_PASSWORD_LENGTH` = 8. The name is stored as `full_name`, which the profiles trigger, chat and the sidebar read.
- **`src/lib/permissions.ts` (browser):** `getPermissions()` → `{ via: "github" | "email" | "google" | null, chat, files, git }` (a Supabase GitHub sign-in counts as `github`); `canUseGit()`; messages `NEEDS_GITHUB`, `NEEDS_LOGIN`. Anonymous chat users count as signed out. In fake mode (no GitHub keys), `git` is true so the screens work on sample data. The server still enforces it: git actions return 401 without the GitHub cookie.
- **Profiles:** `supabase/profiles.sql` names the profile from `full_name`, else the part of the email before the @. There's deliberately **no email column**: every signed-in user, including anonymous chat users, can read `profiles`.
- **Gaps (2026-10-15):** the email form and **`/login/reset`** page are Trin's task (`BOARD/Pending/2026-10-15-email-login-frontend.md`); until then a reset link lands on a 404. Supabase settings (Email provider, Confirm email off for the demo, redirect URLs) are Pattadon's. Not yet tested against the real Supabase project.
- **Tests:** 37 logic checks ran against a fake Supabase client (scratch script, not in the repo); `tests/profile.test.mjs` covers the profile side (`npm test`).

## Sources
- `PLAN/2026-10-15-email-password-login.md` (includes the "changes while building" notes)
- PR #6 on GI-04/CoCommit

**Last checked against sources:** 2026-10-15
