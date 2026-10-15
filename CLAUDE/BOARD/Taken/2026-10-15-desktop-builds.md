# Task: Tauri desktop app for Windows (and macOS build steps)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Kin · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
Make `src-tauri/` build a desktop app whose window loads the deployed Vercel URL (no static export).
- Fill `src-tauri/build.rs`, `src/main.rs` and `src/lib.rs`; generate icons with `npx tauri icon`
- Build the Windows `.msi` on your PC
- Write the exact macOS build steps so Pattadon can build the `.dmg` on a Mac

Part of `CLAUDE/PLAN/2026-10-15-demo-scope.md` (deadline **2026-10-16 11:30**). Work on your own branch and merge by PR.

## Acceptance
- The Windows installer opens CoCommit and sign-in, commit and chat work in it.
- The macOS steps are written down and work on Pattadon's Mac.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** Kin (with Claude-Kin) · **Taken on:** 2026-10-15
- **Scope:** `src-tauri/` (Rust entry files, config, icons, BUILDING.md); `next.config.ts` static-export switch removed. Branch `kin/desktop-builds`.
- **Progress:** Rust files filled; window loads `build.frontendDist` (`http://localhost:3000` until the Vercel URL exists); placeholder icons generated; macOS + Windows steps in `src-tauri/BUILDING.md`. Windows build OK (`.msi` 2.7 MB + NSIS `.exe` 1.8 MB, 3 min); built app launches. `npm run tauri dev` with the merged screens: window opens and loads `/` → `/repo` (dev server log). Repo (fake commit) and Context (edit + save) work; Chat crashes ("This page couldn't load") from two screen bugs (frontend's files, not fixed here): `useEffect(() => end.current?.scrollIntoView(...))` in `src/app/chat/page.tsx:14` returns the Promise newer Chromium gives back (fix: wrap the body in braces), and `src/lib/mock.ts:70` builds times from `Date.now()` at load, so server and client render different times (hydration mismatch). PR #2 merged. `build.frontendDist` now `https://cocommit.vercel.app` (branch `kin/desktop-vercel-url`); rebuilt `.msi`/setup `.exe`, and the installed window loads `https://cocommit.vercel.app/` (title "CoCommit", read via WebView2 debug port). Not yet tested: real sign-in/commit/chat (libs are fake), the macOS steps on a Mac.
- **Blockers:** real sign-in/commit/chat (Proud's GitHub lib, chat-backend), Chat crash fix (Trin), macOS build on Pattadon's Mac.

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
