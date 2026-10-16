# Plan: glass pill buttons, tab slide everywhere, team spines, Home summaries

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**Proposed by:** Claude-Trin (for Trin) · **Approved by:** Trin (2026-10-16, in chat: "Plan approved: set it to active and build it. Commit locally in phases, don't push.")

## Why
Trin marked up the live site (Agent Context, Messages → Team, Home) and sent book/tape reference pictures:
1. The red-boxed buttons (Ask assistant, Refresh / New task / Invite, Customize) look like dark squares, not like the rounded glass of the tabs and navigation. Cause: `Button` (`ui.tsx`) has both `rounded-md` and `rounded-full`, and `rounded-md` wins; Invite is a hand-made link with `rounded-xl border-black`.
2. Only Home's tabs slide. Messages (Chat / Team / Call) are three pages, so the page remounts and the glass thumb just jumps. Other hand-made tab switches have no slide either.
3. Team cards (Agent Context → Team) and Members (Messages → Team) are hard to read: colours cycle at random, agents have very long names, and long details sit on the card.
4. Home cards are only shortcuts; Trin wants a short summary of real items on each.

## Decisions (Trin, in chat)
Team cards = **stacked spines** (Dumbling.FM style); on **Agent Context → Team** and **Messages → Team → Members**; buttons = **glass pills, blue stays solid**.

## Approach (no new packages)
1. **Buttons:** drop `rounded-md` from the `Button` base so each variant's own radius applies. `glass` = secondary (pill, same glass as the tabs), `blue` = solid blue pill with a soft top highlight, `primary` = solid pill (black inside colour cards, as now), `ghost` = outlined pill. Invite becomes a `Button`-styled link. Landing-page buttons are **not** touched.
2. **Tab slide:** `LinkTabs` becomes a client component with the same equal-width track and sliding glass thumb as `Tabs`; the thumb starts at the previous tab's place (kept in a module variable, which survives client navigation) and slides to the new one (first load: no animation). The same slide goes on the hand-made switches: Repository Changes / Files, email Log in / Sign up, Drive list / grid. Same 300 ms curve; off with `prefers-reduced-motion`.
3. **Team spines:** new `src/components/TeamSpines.tsx` + pure `src/lib/team.ts` (`groupTeam`, tested). Each person is one wide spine (avatar, name, one-line role, chevron); their agents hang under them in the same colour, labelled "Claude · Pattadon's agent" instead of the long name; colour = one per person (not per row). Tap a spine to open it: Role, Can do, Available, May write, at normal size (button with `aria-expanded`, keyboard works). Agents are matched to people by Title (`Claude-Pattadon` → `Pattadon`); anyone unmatched stays on their own. Members on Messages → Team uses the same component with the round message and call buttons kept beside each spine.
4. **Home summaries:** each shortcut card gets 1-3 lines of real data under its blurb: Repository = latest commit (message, who, when); Messages = last two chat lines; Agent Context = "Next:" first line of the handoff's next step; Drive = three newest files. Reads reuse `listCommits`, `loadMessages`, `loadWorkspace`, `listSharedFiles`; a card whose data can't load (signed out, no workspace, error) keeps today's blurb.

## Files touched
`src/components/ui.tsx`, `LinkTabs.tsx`, new `TeamSpines.tsx`, `src/lib/team.ts`, `tests/team.test.mjs`; `src/app/{context,tasks,repo,files,home}/page.tsx`, `src/components/EmailLogin.tsx`, `src/components/home/{CardsTab,data}.tsx`, `src/app/globals.css`; notes (LIB `figma-ui`, HANDOFF, LOG).

## Risks / needs OK
- `Button` is used all over the app: a radius change touches every screen, so I check each page at phone, tablet and desktop width.
- Home opens up to four extra reads (commits are already read). Each is small and fails quietly.
- Chat lines need a real login; without one the Messages card keeps its blurb.
- `ui.tsx` must stay free of React and `next/link` imports (profile test).
- Commits stay local; nothing is pushed. Merging to `main` deploys.

## How we'll verify
`npm run typecheck`, `npm test` (new `team` test), `npm run build`; browser on demo data at 390 / 834 / 1440 px: pill radius on every button group, thumb moves from the old tab to the new one on Chat → Team → Call, spines open/close with mouse and keyboard, agents sit under their person, Home cards show summaries and fall back, no console errors. **Not verifiable here:** real GitHub / Supabase data in the summaries.
