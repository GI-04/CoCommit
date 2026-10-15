# Task: Login screens (sign in with GitHub, who's signed in, sign out)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Trin (only) · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
The frontend half of login. The backend half is `2026-10-15-login-backend.md` (Pattadon / proud / Kin). Build against the helpers already in `src/lib/github-client.ts`, which work today: GitHub keys are live on https://cocommit.vercel.app, and localhost uses fake mode until the dev keys are in.
- `getSession()` → `{ user: { login, name, avatarUrl } | null, fake }`
- `signInHref(returnTo)` → link to start GitHub sign-in (`/api/github/login?returnTo=…`)
- `signOutOfGitHub()` → signs out

Screens:
1. **`/login`:** replace the Google button with **"Sign in with GitHub"**, a short line on why (commit and open PRs from the app), and the `?error=` message if sign-in failed.
2. **Sidebar user chip** (`src/components/UserChip.tsx`): avatar, name and **Sign out** from `getSession()`. When signed out, show a **Sign in** button instead.
3. **Signed-out states:** Repo and Context show a friendly "Sign in with GitHub to see your repos" card instead of errors. Chat can be read, and its input asks you to sign in.
4. **Back where you were:** after sign-in, return to the page you started from (`returnTo`).
5. **Loading and errors:** no flash of the signed-out view while `getSession()` loads. An expired session (401) shows the Sign in button, not a crash.
6. Works at phone width and in the Tauri desktop window.

Browser code must import from `@/lib/github-client` / `@/lib/github-types`, never `@/lib/github` (dev reload loop, see GOTCHAS).

## Acceptance
- On the live site: Sign in → GitHub → back on the same page with your name and avatar in the sidebar. Reloading keeps you signed in, and Sign out returns to the signed-out views.
- The signed-out and loading states look intentional on Repo, Chat and Context, with no console errors.
- `npm run typecheck` and `npm run build` pass.

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
