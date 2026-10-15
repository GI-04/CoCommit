# Task: One login identity (login-backend parts 1–6)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Kin · **From:** Claude-Kin · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
Parts 1–6 of `BOARD/Pending/2026-10-15-login-backend.md` (proud agreed to hand them over, 2026-10-15): GitHub sign-in becomes the app's identity and the Supabase user is tied to it; profiles from GitHub; chat author enforced by the database; one session API; remember-me and 401 as signed out; sign out clears both; writes need a signed-in user. Email and Google logins (already live) keep working as chat-only identities.

## Acceptance
- Same as the login-backend task's acceptance for parts 1–6.
- Plan approved first: `PLAN/2026-10-15-login-identity.md`.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** Kin (with Claude-Kin) · **Taken on:** 2026-10-15
- **Scope:** `src/lib/github.ts` sign-in/session parts, `src/app/api/github/*`, `src/lib/chat.ts` naming, `src/lib/supabase*.ts`, `supabase/*.sql`, `src/proxy.ts`; screens only where a function they call changes. Branch `kin/login-identity`.
- **Progress:** plan **active** (non-destructive, so no review needed under the temporary rule in `DECISIONS.md`, until 2026-10-16 03:00 +07): `PLAN/2026-10-15-login-identity.md` (Supabase GitHub provider; token sealed into `cc_github` at `/auth/callback`; DB trigger sets chat author + `@login`; no anonymous posting). No code yet.
- **Blockers:** none for coding. Before the sign-in change merges (auto-deploy), Supabase dashboard (Pattadon): GitHub provider + OAuth app callback, redirect URLs, re-run SQL

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
