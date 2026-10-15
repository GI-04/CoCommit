# Project: CoCommit

<!-- Stable facts. Change rarely; log why in DECISIONS.md. -->

## What & why
CoCommit replaces the messy Discord-to-GitHub workflow with one platform. It makes git easy for beginners with interactive buttons instead of the terminal, and adds calls, chat, file sharing and a task assign/track system. It's for small teams, especially beginners, and must work on desktop and phone.

## Goals
- v1: a prototype that can be demoed and submitted at a hackathon.

## Non-goals
- unknown — ask (e.g. replacing GitHub itself, a full IDE).

## Stack
- **Approved 2026-10-15** (`PLAN/2026-10-15-stack.md`), as built: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 · GitHub REST API (no Octokit) · Supabase (auth, Postgres, Realtime) · Tauri 2 (desktop) · Vercel (hosting).
- **Calls** (added 2026-10-16, `PLAN/2026-10-16-livekit-calls.md`): LiveKit in `/calls`, live since PR #26.
- **Tasks board** (added 2026-10-16, `PLAN/2026-10-16-tasks-board.md`): `/tasks` reads and moves the repo's `COCOMMIT/BOARD/` files through the GitHub API; no new service.
- **Not in the demo** (`PLAN/2026-10-15-demo-scope.md`): phone install. File sharing was added after (`/files`, `PLAN/2026-10-16-files.md`; files saved in `COCOMMIT/files/`).

## Architecture
Three parts:
- **Web app** on Vercel: https://cocommit.vercel.app. Every push to `main` deploys automatically through GitHub Actions (`.github/workflows/deploy-vercel.yml`, LIB `deploy`).
- **Desktop app** (Tauri): a window that loads the live site. Links that open a new window go to the system browser. In the desktop app only, the Repo page's **Local folder** mode runs the user's own `git` on a picked folder through Rust commands (`src-tauri/src/git.rs`).
- **Hosted services:** GitHub (OAuth sign-in + REST API for repos, commits, PRs) and Supabase (email/Google sign-in, profiles, chat with Realtime).

The full feature list is in `README.md` ("What works today").

## Key paths
- `README.md`: features, setup, keys, desktop, deploy, layout.
- `src/app/`: pages (`repo`, `chat`, `context`, `login`, `profile`, `calls`, `tasks`; coming soon: `files`), GitHub API routes in `api/github/`, Supabase auth callbacks in `auth/`.
- `src/lib/`: `github.ts` (server only) / `github-client.ts` (browser) / `github-types.ts`; `chat*.ts`, `supabase*.ts`; `context.ts` + `workspace.ts` (`COCOMMIT/` team context); `tasks.ts` + `tasks-text.ts` (Tasks board); `local-git.ts` + `git-status.ts` (desktop Local mode); `auth-email.ts`, `profile.ts`, `permissions.ts`.
- `src/proxy.ts`: Supabase session refresh (and the optional login wall).
- `supabase/`: SQL to run once in Supabase.
- `src-tauri/`: desktop shell (Rust): `src/lib.rs` (window, links), `src/git.rs` (local git), `BUILDING.md` (builds and installers).
- `.github/workflows/`: `deploy-vercel.yml` (auto-deploy `main` to Vercel); desktop builds (`desktop-macos.yml`, `desktop-windows.yml`); installers for the site's download button in `public/downloads/`.
- `tests/`: Node tests (`npm test`).
- `CLAUDE/`: agent workspace (instructions, board, memory). LIB index: `CLAUDE/LIB/pointers/general.json`.
