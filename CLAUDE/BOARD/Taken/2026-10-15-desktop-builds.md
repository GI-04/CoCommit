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
- **Progress:** Rust files filled; window loads `build.frontendDist` (`http://localhost:3000` until the Vercel URL exists); placeholder icons generated; macOS + Windows steps in `src-tauri/BUILDING.md`. Windows build OK (`.msi` 2.7 MB + NSIS `.exe` 1.8 MB, 3 min); built app launches. Not yet tested: sign-in/commit/chat inside it (screens are still empty), the macOS steps on a Mac.
- **Blockers:** acceptance needs the Vercel URL (Pattadon's accounts task) and working screens; then set `build.frontendDist` and rebuild.

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
