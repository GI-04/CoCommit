# Plan: Liquid glass 3: crisper, sharper, snappier

**Status:** done <!-- Trin picked q1:a q2:a q3:a on 2026-11-10; built and verified the same day, committed on trin/glass-crisp -->
**Date:** 2026-11-10 · **Superseded by:** —

## Why
Trin: "make all of the liquid glass elements on the web app and web better: crisper, sharper, snappier over all".
Liquid glass 2 (`PLAN/2026-10-22-liquid-glass.md`, PR #69) reads soft: a milky top-to-bottom sheen, a 40 px inner
shadow, a uniform 15 % rim, a wide 12 px frost, and slow motion (thumbs slide for 0.75 s, a pressed button takes 0.7 s to
settle, the pointer light fades for 0.6 s).

## Approach
Same three classes (`.glass`, `.glass-thumb`, `.btn-glass`), same markup: every glass element in the app and on the
landing page changes at once.

1. **Sharper edges (every browser, CSS):** a hairline rim instead of the soft one: a bright 1 px lip along the top
   inside edge, a faint catch of light along the bottom, a thin dark line outside so the glass separates cleanly from
   what's behind it, and a tight contact shadow in place of the wide soft one. The 40 px inner haze goes.
2. **Clearer body (Q1):** less milk in the fill and less frost in the backdrop (blur 20 → about 12 px; lens frost
   12 → about 7), a little more saturation, so what passes under the glass keeps its shape. The canvas-coloured tint
   that keeps white text readable over white cards stays; contrast is measured again.
3. **Sharper lens (Chromium):** a narrower rim with a steeper bend, so the refraction is a thin bright line of bent
   backdrop at the edge instead of a wide smear; the sharp rim fades into the frost over a shorter distance.
4. **Rim light that follows the pointer (Q3):** on hover the bright lip turns toward the pointer (cheap: the existing
   pointer listener writes two more numbers). The soft pointer glow stays as soft as Trin asked for last time, only
   tighter and quicker to appear.
5. **Snappier motion (Q2):** stiffer springs with a smaller overshoot; thumbs slide in about 0.4 s (was 0.75), the
   droplet stretch is smaller and shorter, a press goes in within 80 ms and settles in about 0.35 s (was 0.7), the
   pointer light appears in 0.12 s and fades in 0.3 s. `prefers-reduced-motion` keeps all of it off, as today.
6. **Quicker refit:** the lens follows a size change after 60 ms instead of 120 ms.

## Questions for Trin
- **Q1 clarity:** a) clearer glass, less frost (recommended) · b) keep today's frost, sharpen the edges only.
- **Q2 motion:** a) fast with a small bounce (recommended) · b) fast, no bounce at all · c) keep today's bounce, just
  shorter.
- **Q3 rim light:** a) the lip turns toward the pointer (recommended) · b) no, keep the rim still.

## Changes while building
- The glass got its own springs (`--glass-spring`, `--glass-press`); `--spring` / `--spring-bouncy` are untouched so the
  Repository page moves as before (DECISIONS 2026-11-10).
- Found while checking the frost: in Chromium the lens never frosted its middle (the `operator="in"` mask let the whole
  bent backdrop through). Fixed with a multiply mask (GOTCHAS 2026-11-10). So in Chrome the glass over content is now
  lightly frosted where it used to be fully clear.
- Final numbers: CSS blur 10 px, lens frost 8, rim 6-16 px, thumbs 0.36 s, stretch 0.34 s, press 80 ms in / 0.34 s out.

## Files touched
- `src/app/globals.css`: material knobs, rim, shadows, springs, durations.
- `src/lib/glass-map.ts`: narrower, steeper rim (`lensFit`, `lensMap`); `tests/glass.test.mjs` updated.
- `src/components/GlassEffects.tsx`: two more pointer numbers for the rim light, 60 ms refit.
- No markup changes expected in `ui.tsx`, `Nav.tsx`, `LinkTabs.tsx`, pages.
- LIB `figma-ui`, `LOG.md`, `HANDOFF.md`.

## Risks / needs OK
- Branch: liquid glass 2 is not on `main` yet (PR #69), so this builds on top of it. Work starts uncommitted on
  `trin/repo-magic` (the current branch); Trin picks the branch and PR at the end.
- Less frost means text on glass over busy content leans more on the tint: measured in the browser (≥ 4.5:1).
- Hairlines of 0.5 px only show on high-density screens; on a 1× screen they round to 1 px or vanish, so the look is
  built to hold with 1 px lines alone.
- Not checkable here: real Safari / Firefox, the desktop apps, a real phone.
