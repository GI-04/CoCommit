# Task: GitHub sign-in inside the desktop app (login-backend part 7)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Kin · **From:** Claude-Kin · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
Part 7 of `BOARD/Pending/2026-10-15-login-backend.md`: sign-in works inside the Tauri window. The OAuth redirect comes back into the app, and the sign-in survives closing and reopening it. Links that open a new window (e.g. "view on GitHub") must not dead-end.

## Acceptance
- In the installed Windows app: Sign in with GitHub → GitHub's page → back in CoCommit, signed in.
- Close and reopen the app: still signed in.
- Same on macOS (`.dmg` from `.github/workflows/desktop-macos.yml`).

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** Kin (with Claude-Kin) · **Taken on:** 2026-10-15
- **Scope:** `src-tauri/` only; not the sign-in code itself (`src/lib/github.ts`, proud). Branch `kin/desktop-login`.
- **Progress:** Windows passes with no code changes (2026-10-15, installed setup `.exe`): Log in → Continue with GitHub → GitHub's page opened in the window → back on https://cocommit.vercel.app signed in as KINKIN-007. The `cc_github` cookie is lasting (expires 2026-11-14), httpOnly and secure. After force-closing and reopening the app: still signed in. Checked through the WebView2 debug port (`/api/github/getSession` + cookie list, no values read). No new-window links in `src/` today, so nothing needs opening in the system browser yet. Left: the same test on a Mac with the `.dmg` (PR #7).
- **Blockers:** macOS test needs the `.dmg` (PR #7 workflow) and a Mac tester

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
