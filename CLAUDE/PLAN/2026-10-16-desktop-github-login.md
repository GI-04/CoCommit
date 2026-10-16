# Plan: GitHub sign-in in the desktop app (system browser + deep link)

**Status:** active <!-- approved by the user in chat, 2026-10-16 -->
**Date:** 2026-10-16 · **Superseded by:** —

## Why
In the installed desktop app, after Log out, "Continue with GitHub" leaves a blank white window (reproduced 2026-10-16 on macOS, waited 15 s). The server side is fine (`/api/github/login` → Supabase → github.com redirects work in a normal browser); the app's webview can't show GitHub's pages.

## Approach
1. In the desktop app, the GitHub buttons open `/api/github/login?desktop=1` with `target="_blank"`; `lib.rs` already sends new-window links to the system browser.
2. The browser runs the normal sign-in. `/auth/callback` sees `desktop=1`, and instead of finishing in the browser it seals the Supabase session tokens + GitHub token into a short-lived ticket (AES-256-GCM, 5 min expiry) and redirects to `/auth/desktop?ticket=…`, a page that opens `cocommit://auth?ticket=…`.
3. The desktop app registers the `cocommit://` scheme (Tauri deep-link plugin; single-instance plugin so Windows/Linux pass the link to the running app). On the link, the main window loads `/auth/desktop/finish?ticket=…`, which checks the ticket, sets the session cookies in the app, saves GitHub's token, and redirects to the page the user came from.
4. Tokens never appear in a URL in clear text; a ticket is useless after 5 minutes.

## Files touched
- `src/lib/desktop-handoff.ts` (new) — seal/open ticket; `tests/desktop-handoff.test.mjs` (new).
- `src/lib/login-identity.ts` — `githubCallbackUrl` carries `desktop=1`.
- `src/app/api/github/login/route.ts`, `src/app/auth/callback/route.ts` — desktop branch.
- `src/app/auth/desktop/page.tsx`, `src/app/auth/desktop/finish/route.ts` (new); `src/proxy.ts` already lets `/auth/*` through.
- `src/lib/github-client.ts` (`signInHref`) + login page — desktop detection, `target="_blank"`.
- `src-tauri/Cargo.toml`, `tauri.conf.json`, `src/lib.rs` — deep-link + single-instance plugins.

## Risks / needs OK
- New Rust crates: `tauri-plugin-deep-link`, `tauri-plugin-single-instance` (approved by the user 2026-10-16).
- Works only after merging to `main` (deploys the web part) and installing a rebuilt desktop app.
- The ticket is stateless, so it can be replayed within its 5 minutes; fine for a prototype.

## How we'll verify
- `npm run typecheck`, `npm test`, `cargo check` in `src-tauri/`.
- Unit tests for the ticket (round trip, expiry, tampering).
- By hand in the browser: `/auth/desktop/finish` with a bad ticket → `/login?error=`.
- Full flow needs a rebuilt app: not verifiable before installing it.
