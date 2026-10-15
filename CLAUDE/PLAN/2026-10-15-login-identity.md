# Plan: One login identity (GitHub = the Supabase user; chat names enforced by the database)

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **Superseded by:** —
**Proposed by:** Kin (with Claude-Kin) · **Approval:** not needed under the temporary rule in `DECISIONS.md` (2026-10-15, Pattadon: only destructive plans need review until 2026-10-16 03:00 +07); this plan is non-destructive (no deletions, no history rewrite, no secret changes, all reversible). Set active 2026-10-15 23:37 +07 · **Task:** `BOARD/Taken/2026-10-15-login-identity.md` (login-backend parts 1–6; proud handed them over)

## Why
The app has two identities that don't know each other:
- **GitHub** sign-in is our own OAuth (`src/lib/github.ts`, sealed `cc_github` cookie) and is used for repos, commits and PRs.
- **Supabase** handles chat, profiles and email/Google logins, but GitHub users are **anonymous** there.

So the chat author name is whatever the browser sends (`localStorage` "Change name", or a GitHub lookup in the browser). The database only checks `author_id = auth.uid()`, so **anyone can post under any name**, and anonymous visitors can post. The live chat shows it: "Guest 330", renamed guests, and so on.

## Decision: Supabase Auth's GitHub provider (option A)
Sign in with GitHub **through Supabase** (`signInWithOAuth({ provider: "github", scopes: "repo read:user" })`):
- **The Supabase user is the GitHub account.** Supabase stores the GitHub identity in `auth.identities`; users can't edit it, unlike `user_metadata`.
- **The GitHub token stays server-side, as today.** Supabase hands over `provider_token` once, when `/auth/callback` exchanges the code on the server. We seal it straight into the existing `cc_github` cookie (same AES-GCM `seal`, 30 days), so **every git function in `github.ts` stays unchanged**.
- **One GitHub OAuth app for dev and live:** GitHub always calls back to Supabase (`https://<project>.supabase.co/auth/v1/callback`), and Supabase redirects to localhost or Vercel from its allow-list. That also covers login-backend **part 8**.
- **Email and Google users keep working** as chat-only identities. If an email user later signs in with GitHub under the same verified email, Supabase links both to one user.

**Rejected, option B:** keep our own OAuth, and create Supabase sessions on the server with the `service_role` key (admin API + magic-link token). It needs much more custom code, and puts a key that bypasses every database rule on Vercel.

## Approach
1. **Sign-in routes** (names kept, so Trin's screens don't break):
   - `/api/github/login?returnTo=…` starts the Supabase GitHub sign-in on the server and redirects to GitHub.
   - `/auth/callback` exchanges the code, seals `provider_token` into `cc_github`, and goes back to `returnTo`.
   - The old `/api/github/callback` redirects to `/login?error=…` (old links), and is removed after the demo.
   - `signInHref`, `signOutOfGitHub` and `getSession` keep their names and shapes.
2. **Sign out clears both** (part 5): `/api/github/logout` deletes `cc_github` **and** signs out of Supabase on the server. The email helper `signOut()` already does both.
3. **Remember me / 401** (part 4): the Supabase session (refresh token, kept fresh by `src/proxy.ts`) plus the 30-day `cc_github` cookie. When GitHub revokes or expires the token, `getSession` already returns `user: null`. Add one case: a Supabase GitHub user **without** a usable `cc_github` gets `{ user: null, needsReconnect: true }`, so the UI shows "Sign in with GitHub" rather than an error.
4. **Profiles from GitHub** (part 2, `supabase/profiles.sql`):
   - Add a `github_login` column. `handle_new_user` fills `name` / `avatar_url` from the GitHub metadata (`full_name` / `name` / `user_name`, `avatar_url`), and `github_login` from the GitHub identity.
   - A trigger on `auth.identities` fills it when an existing user links GitHub later.
   - Column grants: users can update only `name` and `avatar_url`; `github_login` can't be edited.
5. **Chat author enforced by the database** (part 2, `supabase/schema.sql`):
   - A `before insert` trigger on `messages` **overwrites** `author` with the poster's `profiles.name` (fallback: GitHub login, then "Member"), and sets a new `author_login` from `profiles.github_login`. Whatever the browser sends is ignored.
   - The insert policy also requires a **non-anonymous** user: `coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false`.
   - **Reading stays open** to anonymous users (part 6: "reading stays open for the demo").
   - Existing rows are untouched.
6. **Chat client** (`src/lib/chat.ts`):
   - `myName()` stops using `localStorage` and the browser GitHub lookup; `setMyName` and **"Change name" are removed** (proud agreed). The name is your profile name, edited on `/profile`.
   - Messages show `author_login` as a verified `@login` (a small `ChatMessage` field).
   - Signed-out visitors can read; sending shows "Log in to chat". That's a one-line message on the existing input. Trin's login-frontend item 3 can restyle it.
7. **Protect writes** (part 6): commits and PRs already return 401 without `cc_github`. Chat posting is now blocked by the database for anonymous users. Context saves go through `writeContext`, so they need GitHub too.
8. **Desktop:** the same redirects inside the Tauri window. Re-run the part 7 restart test.

## Files touched
- `src/lib/github.ts`: `signInUrl` / `finishSignIn` replaced by a `sealToken()` export + `needsReconnect`; git functions unchanged
- `src/app/api/github/login`, `callback`, `logout` routes; `src/app/auth/callback/route.ts`
- `src/lib/github-types.ts`: `Session.needsReconnect?`
- `src/lib/chat.ts`, `src/app/chat/page.tsx` (remove Change name, show `@login`, signed-out input)
- `supabase/profiles.sql`, `supabase/schema.sql` (re-runnable)
- `tests/`: new `login-identity.test.mjs` (route and session logic with a fake Supabase, like `profile.test.mjs`)
- `CLAUDE/LIB` (github-api, chat, email-login, desktop-app notes)

## Needs OK / risks
- **Supabase dashboard (Pattadon):**
  - Turn on Authentication → Providers → **GitHub**, with a GitHub OAuth app whose callback is the Supabase callback URL. The live app can be edited, or a new "CoCommit (Supabase)" app made.
  - Add `/auth/callback` for Vercel and localhost to Redirect URLs.
  - Re-run both SQL files.
- **Everyone signs in once more** after the deploy: old `cc_github` cookies keep git working, but their chat identity is still anonymous until they sign in again.
- **Display names stay editable** (the profile page), so two people could pick the same name. Impersonation is prevented by the verified `@login` next to GitHub users' names, and by the database setting the author: you can only post as yourself. Unique names: not in this plan.
- **Scope:** about 3–4 h of work + testing; deadline 2026-10-16 11:30. If it doesn't land by ~08:00, the fallback is steps 5 and 6 only (database-set author + no anonymous posting), which don't depend on the GitHub provider switch.
- **Overlap:** proud's `fix/new-branch-base` touches `commitFiles` in `github.ts`. This plan doesn't touch the git functions, so it should merge cleanly.

## How we'll verify
- `npm run typecheck`, `npm run build`, `npm test` (new tests: sign-in route builds the Supabase URL with scopes and a safe `returnTo`; the callback seals the token; logout clears both; `needsReconnect`).
- SQL on the live Supabase after Pattadon applies it, in the SQL editor as two test users:
  - an insert with a fake `author` is stored with the real profile name;
  - an anonymous insert is rejected;
  - an update of `github_login` is rejected.
- Live site + desktop app: sign in with GitHub, close and reopen → still signed in; chat shows your name + `@login`; a renamed profile shows the new name on new messages; sign out → Repo and Context signed-out views; chat input says "Log in to chat".
- An email user: chat works, git says "Sign in with GitHub".
