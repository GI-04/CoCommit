# Plan: Home UX fixes (signed-out view)

<!-- Filename: YYYY-MM-DD-<slug>.md. Never delete a plan: set its status instead. -->

**Status:** active
**Date:** 2026-10-18 · **Superseded by:** —

Approved by Trin in chat on 2026-10-18 by picking options from a UX investigation of https://cocommit.vercel.app/home
(signed out, 1440 px and 375 px): `q1:a q2:d q3:a q4:a q5:a`.

## Why
Signed out, Home looked half-built: the Work done card shimmered forever, "Log in with GitHub to see this." showed 3 to 5
times, the in-card "Log in" went straight to GitHub while the sidebar's opened the `/login` chooser, the Team board was a
large empty card, and the card focus ring was 2.4:1 on the dark canvas.

## Approach
1. **Q2d: demo data when signed out.** When GitHub says 401, Home's data cards (Work done, Team board, Overview, Activity)
   show a small made-up team instead, with a "Demo" banner at the top of Home (with a Log in button) and a "Demo" tag
   on each card that shows it. Opt-in per hook, so Profile and Agent Context keep their "log in" message. The shortcut
   cards (Repository, Messages, Agent Context, Drive) keep just their blurb. Demo dates are relative to today so the bars,
   heat map, today and streak look alive.
2. **Q1a: Work done empty state.** The shimmer only while loading; otherwise "–" and the reason, and no bars.
3. **Q3a: one Log in.** The in-card Log in goes to `/login?returnTo=…` (the chooser) like the sidebar, as a plain link.
4. **Q4a: Team board fits its content** when it has no data, instead of stretching to the Work done card's height.
5. **Q5a bundle:** colour-block cards that take focus get the light focus ring (#8FA9FA); on a phone the Home tab bar
   is full width; shortcut card blurbs 12 → 14 px.

## Files touched
- `src/lib/home-demo.ts` (new): the demo commits, board and activity.
- `src/components/home/data.ts`: `demo` in the `ready` state, opt-in demo fallback on 401, `useDemoShown()`.
- `src/components/home/CardsTab.tsx`, `OverviewTab.tsx`, `ActivityTab.tsx`, `Trouble.tsx`, `src/components/HeatMap.tsx`.
- `src/app/home/page.tsx`: the Demo banner; full-width tabs on a phone.
- `src/app/globals.css`: focus ring on colour-block cards.
- `tests/home-demo.test.mjs` (new).

## Risks / needs OK
- Demo data on a real product page could be mistaken for real: every card that shows it carries a "Demo" tag, and the
  banner says so. Overview's "no made-up values" rule now has this one labelled exception.
- Touches Trin's UI area (Trin approved). Changes stay uncommitted on the current branch until Trin says where.

## How we'll verify
- `npm run typecheck`, `npm test`, `npm run build`.
- Local browser, signed out against real GitHub keys (or with the 401 path): Cards / Overview / Activity at 1440 and
  375 px, banner, tags, Log in target, focus ring contrast, Team board height, no sideways scroll.
