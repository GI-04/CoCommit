# Plan: Resizable navigation sidebar

**Status:** done (Trin: snap to rail, new branch trin/resizable-nav; report OUTPUT/2026-10-22-1540-resizable-nav.md)
**Date:** 2026-10-22 · **Superseded by:** —

## Why
Trin asked for a resizable nav bar. On desktop the glass sidebar is a fixed 254 px; people with long repo names or small laptops want it wider or narrower.

## Approach
1. **Desktop (≥ 1024 px):** a thin drag handle on the sidebar's right edge (cursor `col-resize`, a soft glass line on hover). Drag to set the width between **224 and 360 px** (224 = the longest label, "Agent Context", on one line; was 200 in the first draft); the page content moves with it.
2. **Collapse (option A):** dragging past the narrow end (under ~140 px) snaps the sidebar to the icon rail (80 px, the tablet look); dragging out again opens it. Option B: width only, no collapse.
3. **Keyboard and reset:** the handle is a `role="separator"` with `aria-valuenow`; ← / → change the width by 16 px, Enter toggles rail / full, double-click resets to 254 px.
4. **Saved per device** (localStorage `cocommitNavWidth`, like Home's card order). A tiny inline script in `<head>` applies the saved width before the first paint, so the sidebar doesn't jump on reload.
5. How: the width is a CSS variable `--nav-w` on `<html>`; the sidebar uses it and `<main>`'s left padding is `--nav-w` plus the current gap. The rail look at desktop width comes from a `data-nav="rail"` attribute and a Tailwind variant `full:` (desktop and not rail) replacing `lg:` in `Nav.tsx` and `UserChip.tsx`.
6. While dragging: no transitions, `user-select: none`; the light-bending lens refits when the drag ends (it already refits 120 ms after a size change).
7. **Tablet and phone unchanged** (option: tablet rail could also drag open; not planned).

## Files touched
- `src/lib/nav-width.ts` (new) — limits, clamp, snap to rail, read/write the saved value.
- `src/components/Nav.tsx` — the handle, `full:` classes, width from `--nav-w`.
- `src/components/UserChip.tsx` — `lg:` → `full:`.
- `src/components/AppShell.tsx` — width state, `<main>` padding from `--nav-w`.
- `src/app/layout.tsx` — the small inline script.
- `src/app/globals.css` — `full:` variant, handle style.
- `tests/nav-width.test.mjs` (new).
- README (feature line), LIB `figma-ui`.

## Risks / needs OK
- The inline script: a future Content-Security-Policy (security review item 7) must allow it by hash.
- Touches Nav (shared by every page) on the same branch as PR #69 (liquid glass) unless Trin wants a new branch.

## How we'll verify
- `npm test` (new nav-width tests), `npm run typecheck`, `npm run build`.
- Browser pane at 1440, 1024, 768, 375 px: drag wider/narrower, snap to rail and back, keyboard, double-click reset, reload keeps the width with no jump, content padding follows, no sideways scroll, no console errors.
