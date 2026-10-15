# Task: Proper login backend (one GitHub identity, remembered)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** anyone except Trin (Pattadon, proud, Kin and their agents; Trin has the frontend half in `2026-10-15-login-frontend.md`) · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
The app should know who you are, keep you signed in, and use that one identity everywhere. Today there are **two unrelated identities**:
- **GitHub** (`src/lib/github.ts`): our own OAuth. The token lives in an encrypted cookie for 30 days. The live keys are set in Vercel Production; https://cocommit.vercel.app reports `fake: false`, but nobody has signed in yet.
- **Supabase** (`src/lib/chat.ts`, `UserChip.tsx`, `/login`): Google sign-in, which is turned off, or an **anonymous** user for chat. The chat author name is plain text the browser sends, so anyone can post as anyone.

Make **GitHub sign-in the app's login**, and tie the Supabase user to it:
1. **One identity.** After GitHub sign-in, the Supabase user is that GitHub account. One option is Supabase Auth's GitHub provider (scopes `repo read:user`), keeping the provider token server-side the way `github.ts` does now. The other is linking on our own callback. Pick one and write it down in `PLAN/` first.
2. **Profiles from GitHub:** fill `public.profiles` with the GitHub login, name and avatar. Chat takes the author from the profile, not from the browser, with an RLS check or a trigger, so nobody can post under someone else's name.
3. **Session API for the UI:** one call returns `{ user: { login, name, avatarUrl } | null }`, the `getSession` action already in `src/lib/github-client.ts`. Keep the names `signInHref` and `signOutOfGitHub` so Trin's screens don't break.
4. **Remember me:** stay signed in across reloads and browser restarts (30 days). When GitHub revokes or expires the token, treat it as signed out (401), not as an error page.
5. **Sign out clears both** the GitHub cookie and the Supabase session.
6. **Protect writes:** `commitFiles`, `openPullRequest` and posting in chat need a signed-in user. Reading stays open for the demo.
7. **Desktop (Kin):** sign-in works inside the Tauri window. The OAuth redirect must come back into the app, and the cookies must survive a restart.
8. **Dev keys (Pattadon):** create the second OAuth app "CoCommit (dev)" (callback `http://localhost:3000/api/github/callback`) and fill `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in `.env.local` (empty lines already there).
9. Decide what happens to Google sign-in: remove it, or keep it behind `REQUIRE_GOOGLE_LOGIN`.

Suggested split: proud → 1–6, Kin → 7, Pattadon → 8–9. Claim the parts you take in the Taken copy's Scope.

**Part 7 is taken by Kin** (2026-10-15): tracked separately in `BOARD/Taken/2026-10-15-login-desktop.md`, so this task stays open for parts 1–6 and 8–9.

## Acceptance
- On https://cocommit.vercel.app: sign in with GitHub, close the browser, reopen it, and you're still signed in as yourself.
- Chat shows your GitHub name and avatar. Posting as another name is rejected by the database.
- Sign out works, and Repo / Context fall back to signed-out views.
- The same works in the Tauri desktop app on macOS and Windows.
- `npm run typecheck` and `npm run build` pass. No secrets in git.

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
