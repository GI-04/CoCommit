# Plan: Download button for the desktop app

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **Superseded by:** —

## Why
The desktop app is only reachable as a GitHub Actions artifact (private repo, login needed, expires in 14 days). Testers need one public link. We host the installers inside the Vercel site and add a button that picks the right one for the visitor's OS.

## What
1. **Installers** live in `public/downloads/` (served at `/downloads/<file>`):
   - `CoCommit-macos.dmg`, universal build (from the CI artifact `CoCommit-macos-dmg`, unzipped, then renamed).
   - Windows: not built yet. Button shows "Windows: coming soon" (disabled).
2. **`src/lib/downloads.ts`**: one list of platforms (`id`, label, `href | null`, `file`) and a `detectOs(userAgent)` helper (mac / windows / other).
3. **`src/components/DownloadButton.tsx`** (client component):
   - Detects the OS after mount (no SSR mismatch), shows "Download for macOS" (link with `download`) or the disabled Windows button.
   - Other OS (Linux, phone): shows "Desktop app: macOS now, Windows soon" with both options listed.
   - Hidden inside the Tauri app itself (`window.__TAURI_INTERNALS__`), since the user already has it.
   - Small note under the macOS button: the first-open `xattr -cr` step (ad hoc signing), linking to the steps.
4. **Where it shows:** the sidebar bottom in `Nav.tsx` above the user chip, and the home page (`src/app/page.tsx`).

## Not in this plan
- Building the Windows `.msi` (needs a Windows PC or a CI job).
- Code signing / notarization.
- Auto-updates.

## Notes and risks
- **The `.dmg` is a binary in git** if committed (size unknown, probably ~10 MB). Alternative: don't commit it, and deploy it with `vercel deploy --prod` straight from the folder. Then it vanishes on the next deploy from a clean checkout, so committing is simpler. Pattadon decides.
- Someone must supply the `.dmg`: run **Actions → Desktop app (macOS)** and download the artifact (see `src-tauri/BUILDING.md`). Until then the macOS link would 404, so the button stays disabled when `href` is `null`.
- Vercel deploys from the CLI: the live site only changes after `vercel deploy --prod`.

## Steps
1. Add `downloads.ts` and `DownloadButton.tsx`; place in Nav and home page. (Claude-Pattadon)
2. Put the `.dmg` in `public/downloads/` and set its `href`. (whoever has the CI artifact)
3. Typecheck, check in the preview on mac / windows / phone user agents.
4. Deploy with `vercel deploy --prod`.
