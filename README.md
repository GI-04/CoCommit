# CoCommit

Git without the terminal, plus team chat and one shared context for everyone's AI agents. Built for small teams of beginners who currently bounce between Discord and GitHub.

**Live:** https://cocommit.vercel.app · **Desktop:** Windows `.msi` and macOS `.dmg` (Tauri) · Hackathon prototype, deadline 2026-10-16 11:30.

## What works today

| Area | Status | What you can do |
|---|---|---|
| **Login** | ✅ live | **Log in** → GitHub (needed for git) or Google. Remembered on the device. Profile page at `/profile`. Email/password: backend done, form not built yet. |
| **Repo: GitHub mode** | ✅ live | Pick a repo and branch, edit a file, commit (optionally to a new branch), see the branch's changes, open a pull request. Everything goes through the GitHub API, on web and desktop. |
| **Repo: Local folder mode** | ✅ desktop only | Open a clone on your computer: Staged / Changes / Untracked, stage, discard, diffs, commit, pull, push. Uses your own `git` and its login; not shown on the website. |
| **Chat** | ✅ live | One live channel per repo (Supabase Realtime). Commits and PRs post themselves into chat. Pin messages, or save one as a **decision** or **gotcha**. |
| **Context** | 🟡 logic done, screen on demo data | Each repo gets a `COCOMMIT/` team workspace (handoff, team, decisions, gotchas, log, todo, task board) that every teammate's AI agent reads first. Load/save and the auto-filled log work; the tabbed screen is in progress. |
| **Desktop app** | ✅ Windows, 🟡 macOS | A Tauri window that loads the live site. Links open in your browser. Windows installer builds; the macOS `.dmg` builds on GitHub Actions. |
| Tasks, Files, Calls | ⏳ coming soon | Placeholder pages. |

## Stack
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 · GitHub REST API (no Octokit) · Supabase (auth, Postgres, Realtime) · Tauri 2 (desktop) · Vercel (hosting). Plans and decisions: `CLAUDE/PLAN/`, `CLAUDE/DECISIONS.md`.

## Run it locally
Needs Node.js 20.9+ and git.

zsh (macOS):
```bash
npm install
```
```bash
cp .env.example .env.local
```
```bash
npm run dev
```

PowerShell 7 (Windows):
```powershell
npm install
```
```powershell
Copy-Item .env.example .env.local
```
```powershell
npm run dev
```

Then open http://localhost:3000. **With an empty `.env.local` everything runs on demo data** ("fake mode"), so you can work on screens without any keys. Check which keys you have, without printing them, with `node scripts/check-env.mjs`.

### Keys (`.env.local`)
| Variable | For | Where to get it |
|---|---|---|
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub login and git buttons | A GitHub OAuth app with callback `http://localhost:3000/api/github/callback` (the **dev** app; the live site has its own) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chat, Google/email login, profiles | Supabase project → Project Settings → API |
| `REQUIRE_GOOGLE_LOGIN` | Optional | `true` forces a login wall; off for the demo |

Ask Pattadon for the team's values one-to-one. **Never commit `.env.local`** or paste keys into chat or the board. Step-by-step setup: `CLAUDE/OUTPUT/accounts-and-keys-setup.md`.

### Checks
```bash
npm run typecheck
```
```bash
npm run build
```
(Same commands in PowerShell.)

## Desktop app
zsh or PowerShell, with the Rust toolchain installed:
```bash
npm run tauri dev
```
**Download the installers** from GitHub → **Actions** → **Desktop app (Windows)** (`.msi` and setup `.exe`) or **Desktop app (macOS)** (`.dmg`) → **Run workflow**, then the run's **Artifacts**. Or build Windows locally with `npm run tauri build`. Details in `src-tauri/BUILDING.md`.

The installed app shows whatever is deployed at https://cocommit.vercel.app, so web changes reach it after a deploy, with no rebuild.

## Deploying
The site is deployed with the Vercel CLI from Pattadon's machine. **Pushing to GitHub does not deploy.** From a clean, up-to-date checkout of `main`:
```bash
vercel deploy --prod
```
After changing environment variables in Vercel, add `--force` so the build doesn't reuse old values.

**One-time Supabase setup** (already done for the team project): run `supabase/profiles.sql`, then `supabase/schema.sql` in the SQL editor, turn on anonymous sign-ins (chat) and the Email and Google providers, and set the Site URL and redirect URLs (`/auth/*`).

## Project layout
| Path | What |
|---|---|
| `src/app/` | Pages: `repo`, `chat`, `context`, `login`, `profile` (plus coming-soon `tasks`, `files`, `calls`). API routes in `api/github/`; Supabase auth callbacks in `auth/` |
| `src/components/` | Shared UI: `Nav`, `UserChip`, `LocalRepo`, `Avatar`, `ui` |
| `src/lib/github*.ts` | GitHub API: `github.ts` (server only), `github-client.ts` (browser), `github-types.ts` |
| `src/lib/chat*.ts`, `supabase*.ts` | Chat backend, pins, Supabase clients |
| `src/lib/context.ts`, `workspace.ts` | `COCOMMIT/` team-context workspace: text helpers, plus load/save through GitHub |
| `src/lib/local-git.ts`, `git-status.ts` | Local git for the desktop app |
| `src/lib/auth-email.ts`, `profile.ts`, `permissions.ts` | Email login, profile, who may use git |
| `src/proxy.ts` | Supabase session refresh (and the optional login wall) |
| `supabase/` | SQL to run once in Supabase |
| `src-tauri/` | Desktop shell (Rust) and `BUILDING.md` |
| `scripts/check-env.mjs` | Shows which keys are set, without printing them |
| `CLAUDE/` | Team and agent workspace (see below) |

## How the team works
People and their AI agents coordinate in `CLAUDE/`. Every agent reads `CLAUDE/CLAUDE.md` (or `AGENTS.md`) first.
- **`BOARD/`** holds tasks: `Pending/` → `Taken/` → `Done/`. Take only tasks addressed to you or "anyone".
- **`COLLAB.md`** lists who's who. Agents are named `<Agent>-<Owner>`, e.g. `Claude-Pattadon`.
- **`HANDOFF.md`** has the current state and next step; **`LOG.md`**, **`DECISIONS.md`** and **`GOTCHAS.md`** record what happened and why.
- **`PLAN/`** holds proposals: big changes get a plan and Pattadon's OK first.
- **`LIB/`** has how-to notes for each part of the code, found through `LIB/pointers/`.

Work on a branch, merge by pull request, and ask before installing packages.

**Team:** Pattadon (full stack, infra) · proud (backend: GitHub API, chat) · Kin (desktop, backend) · Trin (frontend), each with their own agent.
