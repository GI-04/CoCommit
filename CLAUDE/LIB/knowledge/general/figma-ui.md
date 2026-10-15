# Figma look in the app (theme, navigation, Home)

**Added:** 2026-10-16 · **Kind:** reference

## Takeaway
The app follows the Figma file "CO-Commit" (page "test 4", key `A5ao1epDSl3hnbGX599un3`): dark only, chunky colour blocks with black outlines, paper-white rows, glass navigation. It is done by changing the colour tokens, not by rewriting pages (`PLAN/2026-10-16-figma-ui.md`, phases 1 and 2).

## Details
- **Tokens (`src/app/globals.css`):** canvas `#1f1f1f`, accent blue `#1f4ae0` (text uses `accent-soft` `#8fa9fa`), `pink #ff79bf`, `cyan #00a9d8`, `mustard #d8a500`, `green #68ca27`, `clay #e07a5f`, paper `#fffdf8`. Pages keep using `bg-bg / bg-surface / text-fg / text-muted / border-line / bg-accent`.
- **Cards flip the tokens:** `.bg-surface` and `.block-pink|cyan|mustard|green|clay|paper` set dark-on-light values for `--foreground`, `--muted`, `--border` (black), `--background` (paper, so inputs are paper), `--accent` (black primary button). So content inside a card needs no extra classes. Use `<Card tone="pink">` (or `"dark"` for the dark diff panel). Use `hover:bg-fg/10`, never `hover:bg-line/..` (the line colour is black inside cards).
- **Glass:** `.glass` (sidebar, rail, top bar, tab track) and `.glass-thumb` (active item) are a CSS approximation of Figma's liquid glass (blur + inner shadow).
- **Navigation (`src/components/Nav.tsx`):** one element, three sizes: ≥1024 px sidebar with labels, ≥768 px icon rail, below that a top bar with a menu button. Items come from `src/lib/sections.ts` (`title`, `icon`). Hidden on `/` (landing) and `/login*` (see `AppShell.tsx`). Icons are inline SVG in `icons.tsx`; the logo is `public/logo-mark.svg` (exported from Figma, shown with the `invert` class).
- **Shared UI (`ui.tsx`):** `PageHeader`, `Card tone`, `Button` (`primary`, `ghost`, `glass`, `blue`), `Tabs` (buttons only; keep this file free of `next/link` because `tests/profile.test.mjs` loads it with a minimal import list), `Pill`. `Avatar` colours come from the name. Auth screens use `AuthShell.tsx` (`authField`, `authButtons`).
- **Home (`src/app/home/page.tsx`, `src/components/home/`):** tabs Cards / Overview / Activity (last tab remembered in `localStorage` `cocommitHomeTab`). Data hooks in `home/data.ts` give each card the same states (`loading | ready | login | no-workspace | error`) so a card says what is wrong instead of showing made-up numbers. **Customize** (hide, move with arrows) is pure logic in `src/lib/home.ts` (`resolveLayout`, `moveCard`, `toggleCard`, `timeAgo`), stored per device (`cocommitHomeCards`). Cards: a link card per screen, Work done and Team board (from `loadBoard`), Overview stats + heat map + team (COLLAB.md), Activity (`recentActivity`, newest first) + Today + Streak.
- **Not built (no data source, so not mocked):** open-PR count, Calendar, Quick access, Sticky note, Work-done bar chart, Assistant window, per-person conversations.
- **Tests:** `tests/home.test.mjs` (layout, timeAgo), `tests/heatmap.test.mjs` (streak, commits per day). The visuals were checked in the browser at 390 / 834 / 1440 px on demo data only; real GitHub data was not checked.

## Sources
- `PLAN/2026-10-16-figma-ui.md`
- Figma file `A5ao1epDSl3hnbGX599un3`, page "test 4" (frames "Home …", "Auth · …", "Handoff · 4 · Figma → code")
- `src/app/globals.css`, `src/components/Nav.tsx`, `src/components/ui.tsx`, `src/components/home/*`, `src/lib/home.ts`

**Last checked against sources:** 2026-10-16
