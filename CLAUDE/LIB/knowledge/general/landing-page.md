# Landing page and app routes

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
`/` is the marketing landing page with no sidebar. The app's home (section cards) is `/home`. Every other app page keeps its URL and sidebar. Anything that sends a signed-in person "home" should use `/home`, not `/`.

## Details
- `src/components/AppShell.tsx` (client) wraps every page from `src/app/layout.tsx`. On `/` it renders the page alone; everywhere else it renders `Nav` + `<main>`. Route groups were not used, so app page files never moved.
- Landing: `src/app/page.tsx` (server) plus `src/components/landing/`: `Rail.tsx` (commit-graph rail: `Commit` sections on main, `Branch` for the green "coming next" lane), `HeroDemo.tsx` (Terminal/CoCommit tabs; the terminal plays once on load, then flips to a clickable fake Repo screen; reduced motion opens on CoCommit), `Downloads.tsx` (`Downloads`, `HeroDownload`, `DesktopRedirect`).
- Fonts are landing-only: Schibsted Grotesk (`--font-display`) and JetBrains Mono (`--font-mono`, terminal and folder mocks only) via `next/font/google`. Colours reuse the app tokens in `globals.css`, so dark mode follows the system.
- **Get started** (all three buttons): `src/components/landing/GetStarted.tsx` links to `/login?returnTo=/home` and switches to `/home` once the browser turns out to be signed in (a Supabase account that isn't anonymous, or a real GitHub session) or in demo mode; the rule is `getStartedHref` in `src/lib/login-identity.ts`. The three buttons share one check. "Sign in" goes to the login page and "Open the app" (footer) stays `/home`, so visitors can still look around (PLAN/2026-10-16-chat-privacy-get-started.md).
- Desktop app: Tauri loads the site root, so `DesktopRedirect` sends any window with `__TAURI_INTERNALS__` to `/home` (client-side, after the first paint).
- Downloads read `src/lib/downloads.ts`; a platform with `href: null` shows "coming soon". Windows is live since PR #13.
- `/home` defaults: PWA `start_url`, the sidebar's Home item (the sidebar logo goes to `/home` too since 2026-10-16: one click to Home; only the login screens' logo still goes to `/`, the landing page), `auth/callback` fallback, `/login` `safePath` fallback, `auth-email.ts` `safePath`/`returnTo` defaults, and `proxy.ts` (signed-in `/login` goes to `/home`; `/` stays public when the login wall is on).
- **Search and link previews** (PLAN/2026-10-18-seo-pass.md): the root layout makes every page `noindex, follow`; only `/` and `/legal` opt back in (`robots: { index: true, follow: true }` + `alternates.canonical`). A new public page must do the same and be added to `PUBLIC_PATHS` in `src/lib/site.ts` (feeds `sitemap.ts`). `robots.ts` blocks only `/api/` and `/auth/`, so crawlers still see the noindex. The share image (`src/app/opengraph-image.tsx`) and icons (`icon.tsx` 32/192/512, `apple-icon.tsx`) are drawn at build time from `public/logo.svg` / `logo-mark.svg` by `src/lib/brand-image.tsx`. A page that sets its own `openGraph` loses the root share image, so set only `url` on `/` and none on `/legal` (og:title/description fill in from title/description). `src/proxy.ts`'s matcher skips these files so the login wall can't hide them. The landing JSON-LD is a `SoftwareApplication` (free; Web, Windows, macOS).
- **SEO + GEO** (PLAN/2026-10-21-seo-geo.md): the landing title, hero definition (`DEFINITION`), FAQ list (`FAQ`), JSON-LD (`landingJsonLd()`: Organization with `sameAs` the repo, WebSite, SoftwareApplication, FAQPage) and `/llms.txt` (`llmsTxt()`, route `src/app/llms.txt/route.ts`) all come from `src/lib/site.ts`, so the page, its data and llms.txt can't drift (`tests/seo.test.mjs`). FAQ answers must stay true ("free" rests on `docs/LEGAL.md` Fees). Search Console / Bing codes go in `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION`; empty prints nothing. "cocommit" is also other git tools' name: keep "CoCommit" next to "git" and "beginner teams".
- Copy rule: no invented customers, logos, numbers or testimonials. Tasks, Files and Calls are listed as "coming next".

## Sources
- `PLAN/2026-10-15-landing-page.md` (routes and design choices)
- `OUTPUT/2026-10-15-2145-landing-page.md` (verification)
- `PLAN/2026-10-18-seo-pass.md` (robots, sitemap, noindex, share image, icons)
- `PLAN/2026-10-21-seo-geo.md` (title, definition, FAQ, JSON-LD graph, llms.txt, verification)

**Last checked against sources:** 2026-10-21
