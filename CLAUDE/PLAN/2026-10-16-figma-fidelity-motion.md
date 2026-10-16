# Plan: Figma fidelity pass 2 and touch animations

**Status:** done <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**Proposed by:** Claude-Trin (for Trin) · **Approved by:** Trin (2026-10-16, in chat: "make the web version look like the Figma the most, add nice touch animations; UX review comes after; save tokens"). Continues `PLAN/2026-10-16-figma-ui-polish.md` (done).

## Why
Structure now matches the Figma, but sizes and details still differ (tab pill, nav item size, header spacing, Drive cards, auth card, Chat composer, Home "Work done") and the app has no motion.

## Approach
1. **Sizes from the Figma frames (1440 × 1024):** content top 57 px, header row 75 px, tab track 75 px with equal 177 px tabs and a 59 px thumb, nav items 62 px tall (70 px pitch), logo 40 px high, Repository list 298 px wide, auth card 790 px wide, Drive cards 410 px tall.
2. **Details:** Chat composer (round blue send button, header shortcuts to Drive and Call), Team "Add task" dashed button, Home "Work done" bars (commits per day, real data), Home card order, auth wordmark.
3. **Motion (CSS only, no packages, off with `prefers-reduced-motion`):** page enter, sliding tab thumb, card lift on hover, button press, staggered cards and heat map cells, growing bars, Assistant pop-in, scroll reveal on the landing page (where the browser supports it).
4. UX review is a separate step later (Trin's request).

## Files touched
`src/app/globals.css`, `src/components/{ui,LinkTabs,Nav,AppShell,AuthShell,Assistant,HeatMap}.tsx`, `src/components/home/*`, `src/app/{chat,tasks,repo,files,page}.tsx`, notes.

## Risks / needs OK
- Looks only; no behaviour changes. `ui.tsx` must stay free of React imports and `next/link` (`tests/profile.test.mjs`), so the sliding tab thumb is pure CSS (equal-width tabs).
- Commits stay local until Trin says push (PR #39 is open).

## How we'll verify
`npm run typecheck`, `npm test`, `npm run build`; measure the shell in the browser against the numbers above at 1440 px; one screenshot pass (desktop, phone); reduced-motion respected.

## Changes while building (Claude-Trin, 2026-10-16)
- Measured at 1440 px: nav items 62 px at a 70 px pitch, logo at y=72, header row at y=57, cards at y=153 (334 × 136), tab thumb 176 px: all within 1-4 px of the Figma numbers.
- Entrance animations use `fill-mode: backwards` (not `both`), otherwise they would block the hover lift on the same element.
- The browser test pane freezes CSS animations at their first frame; screenshots were taken after `document.getAnimations().forEach(a => a.finish())`. In a normal browser they run.
- Home "Work done" bars are commits per day for the last 7 days (real data); the number is still tasks closed. Home order is now Repository, Messages, Agent Context, Work done + Team board, Drive.
- Not done on purpose: Drive tabs and owner chips, chat avatars and last-message previews, Quick access / Calendar / Sticky note (no data).

