# Plan: Liquid glass 2: light bending, pointer light and springy motion

**Status:** done <!-- built and verified 2026-10-22 on trin/liquid-glass; not committed -->
**Date:** 2026-10-22 · **Superseded by:** —

## Why
Trin: "make the liquid glass effect look and feel better, a nicer animation, light bending". Today `.glass` / `.glass-thumb` /
`.btn-glass` (`src/app/globals.css`) are a blur plus an inner shadow. Nothing bends light, the tab thumbs slide with a
plain ease-out, and the sidebar highlight jumps between items (a known leftover in LIB `figma-ui`). The canvas is a flat
`#1f1f1f`, so there is little for the glass to bend: refraction only shows where something with edges or colour is
behind it.

## Trin's choices (2026-10-22)
- Q1 background: **keep the flat Figma canvas** (no glows, no dots). So the bending shows where content passes under glass
  (phone top bar, landing header, banners); elsewhere the rim, top lip and pointer light carry the look.
- Q2 motion: **springy** (overshoot, droplet stretch, sliding sidebar thumb, squishy press).
- Q3 refraction: **big surfaces and every glass button**.

## Approach
1. **Glass material (every browser, CSS only):** a light rim (a 1 px gradient edge, bright top-left and faint
   bottom-right, drawn with `border-box` backgrounds, no pseudo-elements), a lip of light along the top inside edge,
   deeper soft shadow, and `saturate()` in the backdrop so colours behind the glass glow through. Respect
   `prefers-reduced-transparency` (solid dark glass).
2. **Pointer light:** a soft highlight follows the mouse across glass surfaces and the rim brightens on the side nearest
   it. With touch, a short glow where you tap. One delegated `pointermove` listener; it only writes two CSS variables
   on the glass under the pointer (`--lx`, `--ly`), once per frame at most.
3. **Light bending (Chrome, Edge, the Windows desktop app):** real refraction at the edges of the big glass surfaces
   (navigation, tab bars, banners, landing header) and every glass button (Q3): each gets an SVG displacement filter shaped like a rounded glass
   lens (`backdrop-filter: url(#…)`), rebuilt when its size changes. Safari, Firefox and the macOS desktop app don't
   support SVG filters on the backdrop, so they keep step 1's look (feature check, no broken blur).
4. **Something to bend (Q1):** not done; Trin kept the flat canvas.
5. **Liquid motion (Q2):** a spring easing (CSS `linear()`, falls back to today's ease-out) for every glass thumb; the
   thumb stretches toward where it's going and settles like a droplet; the sidebar highlight becomes one glass thumb
   that slides between items (vertical on desktop/tablet, also in the phone menu); glass buttons press in with a
   springy squish and brighten. `Tabs` stays free of React hooks (tests load `ui.tsx` without React).
   `prefers-reduced-motion` keeps all of it off, as today.

## Files touched
- `src/app/globals.css`: material, rim, pointer light, spring easing, stretch keyframes, reduced
  transparency.
- `src/lib/glass-map.ts` (new, pure): the lens displacement map for a rounded rectangle (tested).
- `src/components/GlassEffects.tsx` (new, client): pointer light + Chromium refraction (SVG filters, ResizeObserver,
  MutationObserver for glass that appears later); mounted once in `src/components/AppShell.tsx`.
- `src/components/ui.tsx` (`Tabs`), `src/components/LinkTabs.tsx`, `src/app/files/page.tsx` (grid/list switch): spring
  and stretch on the thumb.
- `src/components/Nav.tsx`: one sliding glass thumb for the active page.
- `tests/glass.test.mjs` (new): displacement map (neutral middle, pushes along the edge normal, corners, value range);
  `tests/ui.test.mjs` if Tabs' markup changes.
- LIB `figma-ui`, `LOG.md`, `HANDOFF.md`.

## Changes while building
- The frost moved inside the SVG filter (a CSS blur after the lens smeared the bend away): sharp bent rim over a frosted middle.
- Bars and pills got a canvas-coloured tint (`--tint: 0.75`): white text on glass over white cards was unreadable before (landing header, phone top bar).
- Tab thumbs sit in a `.slide-clip` layer so the overshoot never shows a scrollbar.

## Risks / needs OK
- The look moves away from Figma's flat canvas if Q1 adds glows.
- Cost: SVG refraction runs on the GPU in Chromium but redraws when what's behind changes (scrolling under the phone top
  bar). Kept to the big surfaces; checked for dropped frames while scrolling.
- Contrast: text on glass over a glow must stay ≥ 4.5:1 (measured in the browser).
- Branch: new `trin/liquid-glass` from `origin/main` (PR #66 stays as it is). Commit/PR only when Trin says.

## How we'll verify
- `npm run typecheck`, `npm test`, `npm run build`.
- Browser pane (Chromium) at 1440, 834 and 375 px: refraction filters attached and sized, pointer light moves, thumb
  slides and stretches (`getAnimations()`), sidebar thumb slides between pages, no console errors, no sideways scroll,
  contrast of nav and tab text.
- The CSS-only path: force the fallback (refraction off) and check the glass still blurs.
- Reduced motion and reduced transparency emulated.
- Not covered here: real Safari / macOS desktop app / Windows app; a phone.
