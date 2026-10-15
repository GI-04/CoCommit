# Desktop app (Tauri shell, builds, installers)

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
The desktop app is a thin Tauri 2 window that loads the **live site** (`build.frontendDist` = https://cocommit.vercel.app), so web changes reach it after a Vercel deploy, with no rebuild. Rebuild only when `src-tauri/` changes. Installers: Windows `.msi` + setup `.exe`, macOS universal `.dmg`, built locally or on GitHub Actions. Nothing is code-signed.

## Details
- **Files:** `src-tauri/src/lib.rs` (builds the main window in `setup()` from the `tauri.conf.json` window config, which has `"create": false`), `src/main.rs`, `build.rs`, `tauri.conf.json`, `capabilities/`, `icons/` (placeholder "C" logo from `app-icon.png`), `BUILDING.md` (all build steps).
- **Dev vs installed:** `npm run tauri dev` loads `devUrl` (http://localhost:3000, starts `npm run dev`); `npm run tauri build` makes the installers that load the live site.
- **New-window links:** `target="_blank"` and `window.open` would do nothing in the window, so `on_new_window` sends `http`/`https` URLs to the system browser with `tauri-plugin-opener` and denies the in-app window (other schemes are blocked). PR #9.
- **Sign-in:** GitHub sign-in works inside the window: GitHub's page opens there and returns to the site. The `cc_github` cookie (30 days, httpOnly, secure) survives restarts and upgrades; WebView2 keeps it in `%LOCALAPPDATA%\app.cocommit.desktop`. Tested on Windows (installed app) and macOS (proud, debug build, 2026-10-15); see `OUTPUT/2026-10-16-0000-desktop-app.md`. After PR #24 sign-in goes through Supabase (same redirects): re-check once it's live.
- **Local git:** the Repo page's Local folder mode calls Rust commands (`knowledge/general/local-git.md`; merged in PR #11). Pages may only call app commands that a capability with a matching `remote.urls` allows.
- **Installers on GitHub Actions:** `.github/workflows/desktop-macos.yml` (universal `.dmg`, ad-hoc signed with `APPLE_SIGNING_IDENTITY: "-"`) and `desktop-windows.yml` (`.msi` + setup `.exe`). Both run on PRs that change `src-tauri/`, or by hand from Actions → Run workflow; the download is the run's artifact (14 days, team members only, since the repo is private).
- **Public download button** (`PLAN/2026-10-15-download-button.md`): `src/components/DownloadButton.tsx` (sidebar + home page, picks the visitor's OS, hidden inside the app) reads `src/lib/downloads.ts`. Installers are committed in `public/downloads/` and go live with `vercel deploy --prod`: `CoCommit-macos.dmg` (from the macOS workflow run on `main`) and `CoCommit-windows-setup.exe` (NSIS build of the same commit), both rebuilt after PR #11 so they include local git. To update one: rebuild, replace the file under the same name, deploy.
- **Unsigned:** Windows shows "unknown publisher" (More info → Run anyway). macOS may say "damaged": `xattr -cr /Applications/CoCommit.app`.
- **Testing the window from outside:** start it with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223`, then use the Chrome DevTools protocol on http://localhost:9223/json to read the page, call `/api/github/getSession`, list cookie names, or run `__TAURI_INTERNALS__.invoke(...)`. Only one WebView2 instance with different arguments can run at a time: close other CoCommit windows first. In Git Bash, set `MSYS_NO_PATHCONV=1` when passing paths like `/repo`.

## Sources
- `src-tauri/BUILDING.md`: build steps, installers, link and local-git notes
- PRs #2, #3, #7, #9, #11, #12 on GI-04/CoCommit; `BOARD/Done/2026-10-15-desktop-builds.md`, `2026-10-15-login-desktop.md`, `2026-10-15-local-git-rust.md`
- Tauri 2 `on_new_window` / `NewWindowResponse`: tauri 2.12 `src/webview/mod.rs`

**Last checked against sources:** 2026-10-15
