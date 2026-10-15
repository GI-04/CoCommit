# Landing page and app routes

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
`/` is the marketing landing page with no sidebar. The app's home (section cards) is `/home`. Every other app page keeps its URL and sidebar. Anything that sends a signed-in person "home" should use `/home`, not `/`.

## Details
- `src/components/AppShell.tsx` (client) wraps every page from `src/app/layout.tsx`. On `/` it renders the page alone; everywhere else it renders `Nav` + `<main>`. Route groups were not used, so app page files never moved.
- Landing: `src/app/page.tsx` (server) plus `src/components/landing/`: `Rail.tsx` (commit-graph rail: `Commit` sections on main, `Branch` for the green "coming next" lane), `HeroDemo.tsx` (Terminal/CoCommit tabs; the terminal plays once on load, then flips to a clickable fake Repo screen; reduced motion opens on CoCommit), `Downloads.tsx` (`Downloads`, `HeroDownload`, `DesktopRedirect`).
- Fonts are landing-only: Schibsted Grotesk (`--font-display`) and JetBrains Mono (`--font-mono`, terminal and folder mocks only) via `next/font/google`. Colours reuse the app tokens in `globals.css`, so dark mode follows the system.
- Desktop app: Tauri loads the site root, so `DesktopRedirect` sends any window with `__TAURI_INTERNALS__` to `/home` (client-side, after the first paint).
- Downloads read `src/lib/downloads.ts`; a platform with `href: null` shows "coming soon". Windows is live since PR #13.
- `/home` defaults: PWA `start_url`, sidebar logo, `auth/callback` fallback, `/login` `safePath` fallback, `auth-email.ts` `safePath`/`returnTo` defaults, and `proxy.ts` (signed-in `/login` goes to `/home`; `/` stays public when the login wall is on).
- Copy rule: no invented customers, logos, numbers or testimonials. Tasks, Files and Calls are listed as "coming next".

## Sources
- `PLAN/2026-10-15-landing-page.md` (routes and design choices)
- `OUTPUT/2026-10-15-2145-landing-page.md` (verification)

**Last checked against sources:** 2026-10-15
