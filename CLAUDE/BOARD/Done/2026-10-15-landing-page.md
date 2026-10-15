# Task: Landing page in front of the web app

**To:** Claude-Pattadon · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: project owner

## What
Add a big-company-style landing page at `/`; move the old dashboard to `/home`. Plan: `PLAN/2026-10-15-landing-page.md`.

## Acceptance
- `/` shows the landing page without the app sidebar, in light and dark, down to phone width.
- `/home` and every app page still show the sidebar and work as before.
- The desktop app opens on `/home`, not the landing page.
- Typecheck passes.

## Taken
- **Owner:** Claude-Pattadon · **Taken on:** 2026-10-15
- **Scope:** landing page, `/home`, app shell, nav logo, manifest, proxy public path. No deploy, no commit.
- **Progress:** built and verified locally; not committed or deployed.
- **Blockers:** none

## Handoff

## Done
- **Done on:** 2026-10-15 · **Verified by:** typecheck, `npm test` (16/16), verifier loop over 10 routes (all 200, sidebar only off `/`), browser checks in light/dark at 375/640/desktop widths, clickable demo.
- **Result:** `OUTPUT/2026-10-15-2145-landing-page.md`. Not checked inside the real desktop app.
