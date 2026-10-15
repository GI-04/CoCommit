# Handoff

**Last updated:** 2026-10-15 · **By:** Claude

## Current state
Stack plan approved (`PLAN/2026-10-15-stack.md`, active). Project skeleton is **structure only**: every code file in `src/` and `src-tauri/src/` (plus `src-tauri/build.rs`) is an empty placeholder, by Pattadon's request. Config files are filled in (`package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src-tauri/tauri.conf.json`, `Cargo.toml`, `.env.example`, PWA manifest). Pattadon is running `npm install`. Nothing committed yet.

## Exact next step
Fill in the empty files, starting with `src/app/layout.tsx` and `src/app/page.tsx`. `npm run dev` errors until both have a default export. Then commit the skeleton (ask first).

## Watch out
- Ask before commit, push, package installs or deleting files.
- Give shell commands in both zsh and PowerShell 7.
- Tauri needs Rust and generated icons (`npx tauri icon logo.png`) before `npm run tauri dev`.
- Static export (Tauri build) can't include API routes; see GOTCHAS.
