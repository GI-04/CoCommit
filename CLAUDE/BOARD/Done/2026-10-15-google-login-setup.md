# Task: Turn on Google login (Google Cloud + Supabase)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** proud · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
The code is done: `/login` shows "Continue with Google" greyed out as "Not set up yet", and enables it on its own once Supabase reports Google as on (it reads Supabase's public `/auth/v1/settings`). Everything left is settings. No keys go in our code, `.env.local` or Vercel; Supabase holds them.

1. **Google Cloud** (https://console.cloud.google.com): new project `CoCommit`, then **APIs & Services → OAuth consent screen** (newer UI: **Google Auth Platform**).
   - App name `CoCommit`, support and developer email, audience **External**.
   - Then **Publish app**; otherwise only listed test users can log in. Scopes are only email/profile, so no Google review is needed.
2. **Credentials → Create credentials → OAuth client ID**, type **Web application**, name `CoCommit (Supabase)`:
   - **Authorized JavaScript origins:** `https://cocommit.vercel.app` and `http://localhost:3000`
   - **Authorized redirect URI:** `https://ahgwypotqzycuvnkggnw.supabase.co/auth/v1/callback` (Supabase's address, not Vercel's)
   - Copy the **Client ID** and **Client secret**.
3. **Supabase** (project `cocommit`) → **Authentication → Sign In / Providers → Google**: enable, paste the Client ID and secret, save. You need access to the Supabase project: ask Pattadon to invite you (Supabase → Organization → Team), or give Pattadon the two values one-to-one (never in git or chat).
4. Already done by Pattadon: Site URL `https://cocommit.vercel.app`; Redirect URLs `https://cocommit.vercel.app/auth/*` and `http://localhost:3000/auth/*` (the app returns to `/auth/callback?next=…`).

## Acceptance
- https://cocommit.vercel.app/login shows **Continue with Google** clickable (no redeploy needed).
- Logging in with a Google account returns to the page you came from, and the sidebar shows your Google name and picture.
- A new row appears in Supabase `profiles` for that user (trigger from `supabase/profiles.sql`).
- Chat shows the Google name instead of "Guest NNN".

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** proud (settings by proud and Pattadon; closed out by Claude-proud) · **Taken on:** 2026-10-15
- **Scope:** Google Cloud OAuth client + Supabase Google provider; no code
- **Progress:** Google Cloud client created (audience External); Supabase Google provider enabled.
- **Blockers:** none

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** 2026-10-15 · **Verified by:** Supabase `/auth/v1/settings` reports `google: true` (checked by Claude-proud); proud logged in with Google on https://cocommit.vercel.app and the sidebar showed their Google name and picture. Not checked: the `profiles` row and the chat name (closed at proud's request).
- **Result:** `OUTPUT/2026-10-15-1530-google-login.md`
