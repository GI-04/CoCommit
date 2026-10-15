# Handoff

**Last updated:** 2026-10-15 · **By:** Claude-Kin

## Current state
Stack plan approved (`PLAN/2026-10-15-stack.md`, active). Project skeleton is **structure only**: every code file in `src/` and `src-tauri/src/` (plus `src-tauri/build.rs`) is an empty placeholder, by Pattadon's request. Config files are filled in (`package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src-tauri/tauri.conf.json`, `Cargo.toml`, `.env.example`, PWA manifest). Skeleton is merged to `main` (PR #1). Agents are named `<Agent>-<Owner>`. Board: `Pending/2026-10-15-rename-to-proud.md` is for tiramisucake0127 only. Kin took desktop-builds (branch `kin/desktop-builds`): Tauri shell done, Windows `.msi` builds, window loads `http://localhost:3000` until the Vercel URL exists.

## Exact next step
Demo scope is active (`PLAN/2026-10-15-demo-scope.md`, ends 2026-10-16 11:30) and tasks are in `BOARD/Pending/`. Pattadon: accounts and keys. Frontend (layout and screens) is reassigned to Trin; Claude-Pattadon's partial work is on branch `layout-and-screens` (typecheck passes, not yet browser-checked). Fill in the empty files, starting with `src/app/layout.tsx` and `src/app/page.tsx`. `npm run dev` errors until both have a default export. Commit and push with Pattadon's OK. Desktop: once Vercel is up, put its URL in `src-tauri/tauri.conf.json` `build.frontendDist`, rebuild, and Pattadon follows `src-tauri/BUILDING.md` for the `.dmg`.

## Watch out
- Ask before commit, push, package installs or deleting files.
- Give shell commands in both zsh and PowerShell 7.
- Tauri needs Rust; placeholder icons are generated (see `src-tauri/BUILDING.md`).
- No static export: the desktop app loads the web URL.
