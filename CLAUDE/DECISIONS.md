# Decisions

<!-- Newest on top. One short entry per choice someone might later ask "why?" about. Never delete an old decision: when one changes, add a new entry and mark the old one "Superseded by <date/title>". -->

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
