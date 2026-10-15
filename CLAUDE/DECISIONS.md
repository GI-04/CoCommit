# Decisions

<!-- Newest on top. One short entry per choice someone might later ask "why?" about. Never delete an old decision: when one changes, add a new entry and mark the old one "Superseded by <date/title>". -->

## 2026-10-16 — Tasks board stores tasks as files in the repo's COCOMMIT/BOARD/, not in a Supabase table
- **Status:** active
- **Decision:** `/tasks` reads and moves the Markdown task files in `COCOMMIT/BOARD/Pending|Taken|Done/` through the GitHub API; each move is one commit. Plan: `PLAN/2026-10-16-tasks-board.md` (approved by proud).
- **Why:** AI agents already use those files (the folder is the status), so people and agents share one board; no schema change, no new package, nothing new for Pattadon to set up before the demo; every move shows in chat as a git event.
- **Alternatives:** a Supabase `tasks` table with Realtime (live updates and faster lists, but a second source of truth agents can't read, plus SQL to run); GitHub Issues/Projects (rich, but not what the agents' work loop reads).
- **Supersedes / superseded by:** none. Brings the task board back into the demo, which `PLAN/2026-10-15-demo-scope.md` had left out.

## 2026-10-16 — @cocommit bot calls the Claude API with plain `fetch`, not `@anthropic-ai/sdk`
- **Status:** active
- **Decision:** `src/app/api/bot/route.ts` posts to `https://api.anthropic.com/v1/messages` with `fetch`, model `claude-haiku-5-5`, and runs its own tool loop. Plan: `PLAN/2026-10-15-file-bot.md` (approved by proud).
- **Why:** no package install during the hackathon (ask-first rule), same style as our GitHub client (no Octokit), and the loop is small. Haiku 5.5 keeps the cost per question low.
- **Alternatives:** the official SDK (`@anthropic-ai/sdk`) with its typed errors and Tool Runner; Anthropic recommends it for TypeScript projects. Switch if someone approves the install.
- **Supersedes / superseded by:** none.

## 2026-10-15 — Temporary: only destructive plans need Pattadon's review (until 2026-10-16 03:00 +07)
- **Status:** active until **2026-10-16 03:00 (UTC+7)**, then expired on its own. After that, work-loop step 3 applies again as written.
- **Decision (Pattadon, project owner):** plans no longer wait for Pattadon's review unless they're destructive. A destructive plan still goes to `PLAN/` as `proposed` and waits for Pattadon's OK. That covers deleting files, branches or data, force-pushing or rewriting history, dropping or wiping database tables, changing secrets or keys, and production changes that can't be rolled back.
- **Not changed:** each agent's "Off-limits / ask first" list with its own user (commit, push, installs, deletes), each agent's safety rules, and the app's permission prompts. Merging to `main` still deploys to production (auto-deploy), so treat it with care.
- **Why:** to keep work moving overnight before the demo.
- **Supersedes / superseded by:** none. The in-person approval idea (`PLAN/2026-10-15-in-person-approval.md`) was dropped the same day.

## 2026-10-15 — Auto-deploy `main` with a GitHub Actions workflow, not Vercel's Git connection
- **Status:** active
- **Decision:** `.github/workflows/deploy-vercel.yml` deploys every push to `main` (except notes/docs/desktop-only changes) with `vercel deploy --prod` and Pattadon's Vercel token. Typecheck and tests must pass first. The token is a secret in a GitHub environment `production` that only `main` can use. The repo variable `AUTO_DEPLOY=off` pauses push deploys. Plan: `PLAN/2026-10-15-auto-deploy.md`.
- **Why:** Vercel's own Git connection can't deploy teammates' commits: the Vercel team `gi-04` is on Hobby, which blocks private organization repos unless the team owner wrote the commit. This keeps the repo private and costs nothing. The build still runs on Vercel, so env vars stay there.
- **Alternatives:** make `GI-04/CoCommit` public and connect it in Vercel (gives PR previews, but the code goes public); upgrade `gi-04` to Pro ($20 per member per month); keep deploying by hand.
- **Supersedes / superseded by:** none.

## 2026-10-15 — Landing page at `/`, app home at `/home`, sidebar via AppShell
- **Status:** active
- **Decision:** `/` is a marketing landing page without the sidebar; the old dashboard moved to `/home`. A client `AppShell` in the root layout hides the sidebar only on `/`. Post-sign-in fallbacks, the PWA `start_url` and the sidebar logo point to `/home`. Desktop windows on `/` are redirected to `/home` client-side.
- **Why:** Pattadon asked for a big-company-style landing page before the app. AppShell instead of route groups means no app page files move while teammates are editing them, and the desktop app needs no rebuild.
- **Alternatives:** route groups `(marketing)` / `(app)` (cleaner, but moves every page); landing at `/welcome` (keeps `/` as the app, but visitors to the bare domain miss the landing page).
- **Supersedes / superseded by:** none.

## 2026-10-15 — CoCommit profile uses auth metadata; providers remain separate
- **Status:** active
- **Decision:** `/profile` saves full_name/avatar_url to Supabase Auth metadata, then mirrors only name/avatar_url to the authenticated user's existing profiles row. A mirror failure is reported as partial sync, not lost profile data. Email/password updates require the current password. GitHub-owned details link to GitHub settings.
- **Why:** persistent edits work with existing deployed permissions; no new migration or silent linking of unrelated identities. Sidebar and future chat use the same saved CoCommit name first.
- **Alternatives:** browser-only storage (not durable), editing GitHub directly (requires different scope), unified auth (separate pending task).
- **Supersedes / superseded by:** supersedes GitHub-first display-name priority when a real CoCommit account is also signed in; identity unification remains pending.

## 2026-10-15 — AI context is a COCOMMIT/ team workspace, not one file
- **Status:** active
- **Decision:** Replace the single `COCOMMIT.md` with a `COCOMMIT/` folder laid out like /initiate-team (CONTEXT, PROJECT, COLLAB, HANDOFF, TODO, LOG, DECISIONS, GOTCHAS, BOARD), written by a "Set up team context" button. See `PLAN/2026-10-15-context-workspace.md`.
- **Why:** Pattadon's request; it's a stronger pitch (agents work as one team), and we've proven the layout on this repo.
- **Alternatives:** keep one file (simpler, but no roles, board or decision history).
- **Supersedes / superseded by:** supersedes the one-file part of "Demo scope" (2026-10-15)

## 2026-10-15 — Demo uses GitHub sign-in only; chat signs in to Supabase anonymously
- **Status:** active
- **Decision:** `src/proxy.ts` skips the Google login wall unless `REQUIRE_GOOGLE_LOGIN=true`. Chat signs in to Supabase anonymously and shows the GitHub account's name. `UserChip` hides anonymous users.
- **Why:** Pattadon wants GitHub sign-in only for the demo (board task `open-pr-github-api`), and the live site already has Supabase keys, so the wall would block everyone. Anonymous users still count as `authenticated`, so the chat table rules work unchanged.
- **Alternatives:** keep Google (needs its own setup); open the table to `anon` (anyone with the public key could post as anyone); chat in browser-only demo mode.
- **Supersedes / superseded by:** none (the Google sign-in plan stays; the wall is just switched off)

## 2026-10-15 — Chat: own file, stored author name, pin-only updates, browser fake mode
- **Status:** active
- **Decision:** Chat functions live in `src/lib/chat.ts` (not `supabase.ts`, now the shared client from Google sign-in). `messages` stores the author's display name; RLS lets users post only as themselves and update only `pinned`. `onlineUsers` takes a callback. Without keys, chat runs in the browser (localStorage + BroadcastChannel). `github-client` posts git events. proud wired `/chat` (plan option A). See `PLAN/2026-10-15-chat-backend.md`.
- **Why:** avoid clashing with the Google sign-in client; Realtime payloads carry the row only, so no join is needed; nobody can edit others' messages; "online" changes over time; the demo works before keys exist.
- **Alternatives:** join `profiles` for names; a server route for posting; Trin wires the screen (option B).
- **Supersedes / superseded by:** none

## 2026-10-15 — Git API: plain fetch, one JSON route for client screens, fake mode, encrypted token cookie
- **Status:** active
- **Decision:** `src/lib/github.ts` calls the GitHub REST API with `fetch` (no `@octokit/rest`). Client screens use `src/lib/github-client.ts` (same names) through `POST /api/github/[action]`. While `GITHUB_CLIENT_ID` is empty, all functions return fake data. The OAuth token is kept AES-GCM-encrypted in an `httpOnly` cookie. See `PLAN/2026-10-15-github-api.md`.
- **Why:** no package install to wait on; the screens are client components and can't call server code; screens work before keys exist; the token never reaches browser code.
- **Alternatives:** Octokit (adds types, needs install OK); a route per function (more files); token in Supabase (not ready).
- **Supersedes / superseded by:** none

## 2026-10-15 — Demo scope: git buttons, chat, AI context sharing; desktop loads the web URL
- **Status:** active
- **Decision:** For the 24-hour hackathon, demo only git buttons (GitHub API), chat (Supabase Realtime) and a shared `COCOMMIT.md` context file, on web plus Tauri apps for macOS and Windows that load the deployed URL. See `PLAN/2026-10-15-demo-scope.md`.
- **Why:** 24 hours and three people; one code path for git and no static export keeps the desktop app free.
- **Alternatives:** local git in Tauri, calls, tasks, files and phone install; cut for time.
- **Supersedes / superseded by:** none

## 2026-10-15 — Stack: Next.js (React) PWA + Tauri 2, GitHub API, Supabase, LiveKit
- **Status:** active
- **Decision:** Build on `PLAN/2026-10-15-stack.md` as proposed.
- **Why:** One React codebase for web, phone (PWA) and desktop; Next.js gives server routes for secrets (GitHub OAuth, LiveKit tokens).
- **Alternatives:** React + Vite with Supabase Edge Functions; simpler and fits Tauri better, but Pattadon chose to keep the original plan.
- **Supersedes / superseded by:** none

## 2026-10-15 — Adopted CLAUDE/ workspace via /initiate-team
- **Status:** active
- **Decision:** Coordinate people and agents through `CLAUDE/` (LIB, BOARD, PLAN, OUTPUT, project memory), with `CLAUDE.md`/`AGENTS.md` as shared instructions.
- **Why:** Every session starts oriented, work is claimed visibly, and a trail is left.
- **Alternatives:** Ad-hoc notes in chat; rejected because they get lost between sessions.
- **Supersedes / superseded by:** none
