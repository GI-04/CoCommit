# Plan: Landing page

**Status:** done (Pattadon asked for it directly in chat, 2026-10-15) · **Owner:** Claude-Pattadon

## Goal
A marketing landing page in front of the web app, in the style of big product sites (GitHub, Linear, Stripe): one big headline, a live product demo in the hero, honest feature sections, downloads, FAQ and a closing call to action.

## Routes
- `/` → landing page, no app sidebar.
- `/home` → the old dashboard (the section cards), moved from `src/app/page.tsx`.
- App pages (`/repo`, `/chat`, `/context`, …) keep their URLs and sidebar.
- Sidebar logo → `/home`. PWA `start_url` → `/home`.
- Desktop app: it loads the site root, so the landing page sends Tauri windows straight to `/home` (client check for `__TAURI_INTERNALS__`). No desktop rebuild needed.
- `src/proxy.ts`: `/` stays public when the login wall is on; a signed-in visit to `/login` goes to `/home`.

## How
- `src/components/AppShell.tsx` (client) renders the sidebar + `<main>` for every path except `/`. Chosen over route groups so no app page files move while teammates are editing them.
- Landing pieces in `src/components/landing/`. Font: Schibsted Grotesk via `next/font/google` (landing only), JetBrains Mono only inside the terminal mock.
- Signature element: a git commit-graph rail down the left side; each section is a commit on `main`, "On the way" features sit on a green feature branch that merges back before the closing call to action.
- Hero demo: a window with "Terminal" and "CoCommit" tabs. On load the terminal types a push that gets rejected, then flips to the CoCommit view with buttons. Reduced motion: starts on the CoCommit view.
- Uses the existing colour tokens, so dark mode follows the app.
- No invented customers, logos, numbers or testimonials.

## Out of scope
New packages, changes to app screens, deploy.
