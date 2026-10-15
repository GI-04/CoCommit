# Decisions

<!-- Newest on top. One short entry per choice someone might later ask "why?" about. Never delete an old decision: when one changes, add a new entry and mark the old one "Superseded by <date/title>". -->

## 2026-10-15 — AI context is a COCOMMIT/ team workspace, not one file
- **Status:** active
- **Decision:** Replace the single `COCOMMIT.md` with a `COCOMMIT/` folder laid out like /initiate-team (CONTEXT, PROJECT, COLLAB, HANDOFF, TODO, LOG, DECISIONS, GOTCHAS, BOARD), written by a "Set up team context" button. See `PLAN/2026-10-15-context-workspace.md`.
- **Why:** Pattadon's request; it's a stronger pitch (agents work as one team), and we've proven the layout on this repo.
- **Alternatives:** keep one file (simpler, but no roles, board or decision history).
- **Supersedes / superseded by:** supersedes the one-file part of "Demo scope" (2026-10-15)

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
