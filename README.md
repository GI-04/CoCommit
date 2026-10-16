# CoCommit

Git without the terminal, plus team chat and one shared context for everyone's AI agents. Built for small teams of beginners who currently bounce between Discord and GitHub.

**Live:** https://cocommit.vercel.app · **Desktop:** Windows `.msi` and macOS `.dmg` (Tauri) · Hackathon prototype, deadline 2026-10-16 11:30.

## What works today

| Area | Status | What you can do |
|---|---|---|
| **Login** | ✅ live | **Log in** → GitHub (needed for git) or Google. Remembered on the device. Profile page at `/profile`. **Email/password** (log in, sign up, forgot password, reset) is built, not yet tried against real Supabase. |
| **Repo: GitHub mode** | ✅ live | Pick a repo and branch, edit a file, commit (optionally to a new branch), see the branch's changes, open a pull request. Everything goes through the GitHub API, on web and desktop. |
| **Repo: Local folder mode** | ✅ desktop only | Open a clone on your computer: Staged / Changes / Untracked, stage, discard, diffs, commit, pull, push. Uses your own `git` and its login; not shown on the website. |
| **Chat** | ✅ live | One live channel per repo (Supabase Realtime). Commits and PRs post themselves into chat. Pin messages, or save one as a **decision** or **gotcha**. |
| **@cocommit bot** | 🟡 built, needs `ANTHROPIC_API_KEY` | Type `@cocommit` + a question in chat: it searches and summarizes the repo's `COCOMMIT/` files (team status, what changed, who does what, a file, today's chat) with links. Only you see the answer until **Share to chat**. Read only. Questions and team files are sent to the Claude API. |
| **Context** | 🟡 read-only screen | Each repo gets a `COCOMMIT/` team workspace (handoff, team, decisions, gotchas, log, todo, task board) that every teammate's AI agent reads first. The Agent Context screen shows these files in tabs (read-only, with links to edit them on GitHub); the save helpers exist, a form is not built. |
| **Desktop app** | ✅ Windows, 🟡 macOS | A Tauri window that loads the live site. Links open in your browser. Windows installer builds; the macOS `.dmg` builds on GitHub Actions. |
| **Calls** | ✅ live | `/calls` → **Join call**: voice, video and screen sharing inside CoCommit (LiveKit), one room per repo, signed-in people only. Needs the three `LIVEKIT_*` keys locally. |
| **Tasks** | ✅ live | `/tasks`: a Pending / Taken / Done board over the repo's `COCOMMIT/BOARD/` task files, the same ones AI agents use. **New task**, **Take**, **Done** (also adds a `LOG.md` line) and **Release** each make one commit, which shows in chat. Needs GitHub login and a set-up `COCOMMIT/`. |
| **Home** | 🟡 built, demo data only | `/home` has Cards (a card per screen, finished tasks, a small team board; **Customize** hides and reorders cards, saved on the device), Overview (commits, tasks done, open tasks, the **commit heat map**, team) and Activity (recent commits, merged PRs and pinned chat, commits today, day streak). Reads the repo through GitHub; needs GitHub login. |
| **Look** | 🟡 built | The whole app follows the Figma design: dark theme, glass navigation (sidebar on desktop, icon rail on tablet, top bar and menu on phone), colour-block cards; Messages groups Chat, Team and Call; Repository has a Changes / Files list and a numbered diff; Drive is a card grid; Profile and Agent Context are tabbed. Light mode is gone on purpose. |
| **Assistant** | 🟡 built, needs `ANTHROPIC_API_KEY` | A floating button on every app page opens a small window: ask about your team's handoff, decisions or gotchas; it answers from the repo's `COCOMMIT/` files and links its sources (the same bot as `@cocommit` in chat). |
| **Files** | 🟡 built, not yet tried on real GitHub | `/files` (Drive): folders (up to 4 deep), upload (drag-and-drop, up to 25 MB each; big files go up and come down in 3 MB pieces), download and delete team files and folders. They are saved in the repo's `COCOMMIT/files/` folder as normal commits. |

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
| `ANTHROPIC_API_KEY` | The `@cocommit` chat bot (server only) | Claude Console → API keys. Without it the bot replies "not set up" and chat still works |
| `ANTHROPIC_WORKSPACE_ID` | Only with a key not scoped to a workspace (`sk-ant-usr-…`) | Claude Console → the workspace's ID (`wrkspc_…`) |
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
**Every push to `main` deploys automatically** (GitHub Actions, `.github/workflows/deploy-vercel.yml`). The workflow runs typecheck and tests, deploys with `vercel deploy --prod`, then checks that the live site works. A run takes about 2 minutes. Pushes that only change `CLAUDE/`, `COCOMMIT/`, `docs/`, `src-tauri/` or `*.md` files don't deploy.
- **Run it by hand:** GitHub → Actions → "Deploy to Vercel" → Run workflow. Tick **force** after changing env vars in Vercel, so the build doesn't reuse old values.
- **Pause** (for example during a demo): set the repo variable `AUTO_DEPLOY` to `off` (Settings → Secrets and variables → Actions → Variables). Set it back to `on` (or delete it) to resume.
- **Undo a bad deploy:** `vercel rollback`. Vercel then stops moving the site to new deploys until you run `vercel promote <deployment-url>`, and the workflow fails with that hint until you do.
- **Fallback by hand** (Pattadon, from a clean checkout of `main`): `vercel deploy --prod`.

Why not Vercel's own Git connection? On the Hobby plan it can't deploy a private organization repo. The workflow uses Pattadon's token, stored as the secret `VERCEL_TOKEN` in the GitHub environment `Production`.

**One-time Supabase setup** (already done for the team project): run `supabase/profiles.sql`, then `supabase/schema.sql` in the SQL editor, then `supabase/chat-privacy.sql` (chat for real accounts only; check it from outside with `node scripts/check-chat-privacy.mjs`, which must print 0 and 0), turn on the Email and Google providers (anonymous sign-ins are no longer needed; turn them off), and set the Site URL and redirect URLs (`/auth/*`).

## Project layout
| Path | What |
|---|---|
| `src/app/` | Pages: `repo`, `chat`, `context`, `login`, `profile`, `calls`, `tasks`, `files`. API routes in `api/github/` and `api/bot/`; Supabase auth callbacks in `auth/` |
| `src/components/` | Shared UI: `Nav`, `UserChip`, `LocalRepo`, `Avatar`, `ui` |
| `src/lib/github*.ts` | GitHub API: `github.ts` (server only), `github-client.ts` (browser), `github-types.ts` |
| `src/lib/chat*.ts`, `supabase*.ts` | Chat backend, pins, Supabase clients |
| `src/lib/context.ts`, `workspace.ts` | `COCOMMIT/` team-context workspace: text helpers, plus load/save through GitHub |
| `src/lib/bot.ts`, `bot-tools.ts`, `bot-client.ts` | `@cocommit` bot: search/summary helpers, its tools (server), the browser call |
| `src/lib/local-git.ts`, `git-status.ts` | Local git for the desktop app |
| `src/lib/auth-email.ts`, `profile.ts`, `permissions.ts` | Email login, profile, who may use git |
| `src/proxy.ts` | Supabase session refresh (and the optional login wall) |
| `supabase/` | SQL to run once in Supabase (`profiles.sql`, `schema.sql`, then `chat-author.sql`) |
| `docs/API.md` | How screens call git, chat, pins and the team context (function list, errors, rules) |
| `COCOMMIT/` | This repo's own team context, as CoCommit creates it (read by Pin as decision/gotcha and the activity log) |
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
