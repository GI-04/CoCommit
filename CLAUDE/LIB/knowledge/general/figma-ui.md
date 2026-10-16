# Figma look in the app (theme, navigation, Home, polish pass)

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
- **Tests:** `tests/home.test.mjs` (layout, timeAgo), `tests/heatmap.test.mjs` (streak, commits per day), `tests/diff.test.mjs` (diff rows with line numbers). The visuals were checked in the browser at 390 / 834 / 1440 px on demo data only; real GitHub data was not checked.

## Polish pass (2026-10-16, `PLAN/2026-10-16-figma-ui-polish.md`)
- **Navigation = Figma's:** `navItems` in `src/lib/sections.ts`: Home, Repository, Drive (`/files`), Messages (`/chat`, active also on `/tasks` and `/calls`), Agent Context, plus the **Assistant** button (not a page). `sections` is still used by other code (labels).
- **Messages:** `MessagesShell` (title + `LinkTabs` Chat / Team / Call) wraps `/chat`, `/tasks`, `/calls`. `ListPanel` is the left list (on narrow screens it becomes a pill row): chats = `# general` + the person's repos (`useRepos()`, each repo is a live chat); teams = the person's repos (switching sets the repo for tasks, chat, calls). Team also has Invite (GitHub's access page) and Members (COLLAB.md). Grids use `minmax(0,1fr)` on phones, otherwise long URLs widen the page.
- **Assistant (`src/components/Assistant.tsx`):** floating button + window on every app page (provider in `AppShell`), built on `askBot` (`POST /api/bot`): answers from `COCOMMIT/` with sources; conversation is kept while you move between pages; needs `ANTHROPIC_API_KEY` on the server, otherwise the window shows "isn't set up". `useAssistant()` lets other screens open it (Context's "Ask assistant").
- **Repository:** left card with Changes / Files tabs, pink Commit card (message, new branch, Commit, PR title + Open PR, Discard edits), right dark panel with Diff / Edit. `DiffView` + `src/lib/diff.ts` (`parsePatch`, tested) number lines and also serve Local folder mode. Same API calls as before.
- **Drive (`/files`):** coloured file cards (grid) or list, Upload button, dashed upload card, drag and drop on the whole area. Personal / Shared tabs are not built (one shared folder).
- **Profile:** Overview (`components/profile/Overview.tsx`: profile card, commits by you, your repos as teams, recent activity) and Account (details form, connected accounts, email and password). Sign out is in the header. `tests/profile.test.mjs` renders the Account tab and stubs the Overview.
- **Context:** tabs Instructions, Handoff, Team, Decisions, Gotchas, Log, To-do, Board read the real `COCOMMIT/` files through `loadWorkspace` (`useWorkspace`), read-only with "Open on GitHub" links; no longer demo text. Setup form and editing are not built (helpers `setUpWorkspace`, `saveHandoff`… exist).
- **Landing (`src/app/page.tsx`):** Figma sections (glass header, "Git, with buttons.", colour cards, steps, "Get CoCommit.") with the interactive `HeroDemo`, the "Why" diff and the FAQ kept; the old git-graph rail (`components/landing/Rail.tsx`) is no longer used and the stale "Coming next" section is gone. Logos: `public/logo.svg` (wordmark) and `public/logo-mark.svg`, shown with `invert`.
- **Dev note:** after adding an icon, restart `npm run dev`; hot reload can keep an old `icons.tsx` on the server (empty icon, hydration error).

## Motion and fidelity (2026-10-16, `PLAN/2026-10-16-figma-fidelity-motion.md`)
- **Motion is CSS only** (`globals.css`): `.rise` (fade up, `--d` delay for stagger), `.pop`, `.grow` (bars), `.lift` (hover lift on link cards), `.shimmer` (loading), `.reveal` (landing sections, scroll timeline where supported), button press (`:active` scale), sliding glass thumb in `Tabs` (pure CSS: equal-width tabs, `translateX`), page enter in `AppShell` (`key={path}`). `prefers-reduced-motion` turns it all off. Use `fill-mode: backwards`, never `both`, on anything that also has a hover transform.
- **Sizes taken from the Figma frames (1440 px):** content top 57, header row 75, tab thumb 59 / tab 177, nav item 62 at a 70 pitch, logo 40 high at y=72, auth card 790 wide, Drive cards 410 high, Repository list 298 wide.
- **Testing animations:** the browser test pane freezes CSS animations; call `document.getAnimations().forEach(a => a.finish())` before measuring or taking a screenshot.

## Sources
- `PLAN/2026-10-16-figma-ui.md`, `PLAN/2026-10-16-figma-ui-polish.md`
- Figma file `A5ao1epDSl3hnbGX599un3`, page "test 4" (frames "Home …", "Auth · …", "Handoff · 4 · Figma → code")
- `src/app/globals.css`, `src/components/Nav.tsx`, `src/components/ui.tsx`, `src/components/home/*`, `src/lib/home.ts`

**Last checked against sources:** 2026-10-16
