# CoCommit

Git without the terminal, plus chat, calls, file sharing and tasks, for small teams. Works in the browser, on phones (installable PWA) and as a desktop app (Tauri).

## Stack
Next.js + React + TypeScript + Tailwind · Tauri 2 (desktop, local git) · GitHub API (git on web/phone) · Supabase (auth, chat, tasks, files) · LiveKit (calls). See `CLAUDE/PLAN/2026-10-15-stack.md`.

## Getting started
1. Install Node.js 20+.
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in the keys.
4. `npm run dev`, then open http://localhost:3000

Desktop app (needs the Rust toolchain and icons in `src-tauri/icons/`): `npm run tauri dev`

## Layout
| Path | What |
|------|------|
| `src/app/` | Pages: `repo`, `chat`, `tasks`, `files`, `calls`; API routes in `api/` |
| `src/components/` | Shared UI |
| `src/lib/` | GitHub, Supabase and git helpers |
| `src-tauri/` | Desktop shell (Rust) |
| `public/` | Static files and the PWA manifest |
| `CLAUDE/` | Team and agent workspace |
