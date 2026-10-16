# Plan: drag and drop for Home → Customize

**Status:** done <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**Proposed by:** Claude-Trin (for Trin) · **Approved by:** Trin (2026-10-16, in chat: "Plan approved: set it to active and build it. Commit locally, don't push.")

## Why
In Home → Customize the cards can only be moved with the ↑ ↓ arrows (`moveCard`). Trin asked to be able to drag and drop them.

## Approach (no new packages)
- **Pointer events, so it works with a mouse, a pen and a finger** (HTML5 drag and drop does not work on phones). In Customize mode a card follows the pointer once it has moved 5 px (so clicking Hide and the arrows still works); on release it takes the place of the card it was dropped on.
- **Where to grab:** with a mouse or pen, anywhere on the card (cursor shows a grab hand). With a finger, a small grip handle on the card's control chip, because a handle is the only way to keep scrolling the page by touch.
- **While dragging:** the card lifts (shadow, slight scale), follows the pointer, the card under the pointer gets a solid outline as the drop target, and the page scrolls by itself when the pointer is near the top or bottom edge. Escape or a cancelled touch puts the card back.
- **Order only changes on drop**, so there is no flicker when cards have different sizes (Team board is two columns wide).
- **Kept:** the ↑ ↓ arrows and Hide (keyboard and screen-reader way), the layout saved per device (`localStorage`), the hint text now says "Drag a card or use the arrows". A hidden live region says "Moved Repository to place 2 of 6" after any move.
- New pure helpers in `src/lib/home.ts`: `moveCardTo(layout, id, toIndex)` and `cardAt(rects, x, y, skipId)`, with tests in `tests/home.test.mjs`. The pointer handling is a small hook next to `CardsTab` (`src/components/home/useCardDrag.ts`); the lift and drop-target look use Tailwind classes only.

## Files touched
`src/lib/home.ts`, `tests/home.test.mjs`, new `src/components/home/useCardDrag.ts`, `src/components/home/CardsTab.tsx`, `src/app/home/page.tsx` only if the hint text lives there; notes (LIB `figma-ui`, HANDOFF).

## Risks / needs OK
- Pointer handling is the fiddly part (touch scrolling, pointer capture, a card that is dropped outside the grid). I check mouse drags with real pointer events in the browser pane and review the touch path in code; **a real phone drag is not testable here**.
- Reordering on drop (not live while moving) is a deliberate simplification; live reordering can be added later.
- Commits stay local; nothing is pushed. Merging to `main` deploys.

## How we'll verify
`npm run typecheck`, `npm test` (new helper tests), `npm run build`; browser on demo data: drag a card onto another (order changes, is saved, survives a reload), drop on itself or outside (no change), Escape cancels, arrows and Hide still work, a click on a card's controls does not start a drag, no sideways scroll at 390 px.

## Changes while building (Claude-Trin, 2026-10-16)
- Built as planned, with these differences. The move and release are listened for on the **window**, not with pointer capture (capture was not reliable and a release outside the card would be lost). **A pen needs the grip like a finger** (a pen pans the page on many devices, so "mouse or pen anywhere" was wrong): only a mouse grabs a card anywhere. A lifted card is kept on screen sideways and the auto-scroll stops at the page's real bottom (a transformed card adds to the scrollable area, so the page ran on into empty space; found in review). A lost release (menu, other window, a move with no button held), window blur, Ctrl+click and a stale press are handled. Dragged card sits above the glass navigation (z-45, under the Assistant).
- Also: Hide / Show / Reset and moves are announced (a repeated sentence too); the grip is bigger on touch screens; a hidden card keeps one clear opacity while dragged or targeted.
- Pure and tested in `src/lib/home.ts`: `moveCardTo`, `cardAt`, `autoScrollStep` (`tests/home.test.mjs`).
- **Logo link (separate request from Trin, same day):** the sidebar logo now goes to `/home` (one click to Home) instead of the landing page `/`; the login screens' logo still goes to `/`.
- Checked: typecheck, `npm test` 176/176, `npm run build`; in the browser (demo data) a real mouse drag Repository onto Messages (order changes, saved, announced), plus scripted pointer events for Escape, drop on itself, drop on the wide Team board, drop outside, finger on the card body (no drag) and on the grip (drag), pen, Hide press, Ctrl+click, lost release, blur and a stale press; phone width 390 px (grip, arrows and Hide fit, no sideways scroll). Two independent read-only reviews; real findings fixed. **Not checked:** a real phone drag (touch), auto-scroll while dragging near the screen edge (the test pane doesn't run animation frames), Android's long-press menu on the grip.

