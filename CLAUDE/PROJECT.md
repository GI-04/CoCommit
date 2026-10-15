# Project: CoCommit

<!-- Stable facts. Change rarely; log why in DECISIONS.md. -->

## What & why
CoCommit replaces the messy Discord-to-GitHub workflow with one platform. It makes git easy for beginners with interactive buttons instead of the terminal, and adds calls, chat, file sharing and a task assign/track system. It's for small teams, especially beginners, and must work on desktop and phone.

## Goals
- v1: a prototype that can be demoed and submitted at a hackathon.

## Non-goals
- unknown — ask (e.g. replacing GitHub itself, a full IDE).

## Stack
- **Approved 2026-10-15:** see `PLAN/2026-10-15-stack.md` (Next.js PWA + Tauri 2 desktop, GitHub API, Supabase, LiveKit).

## Architecture
Skeleton only. Three parts: the web/PWA client, a Tauri desktop shell that can run local git, and hosted services for auth, realtime data, storage and calls.

## Key paths
- `README.md`: overview, setup, layout.
- `src/app/`: pages (`repo`, `chat`, `tasks`, `files`, `calls`) and API routes.
- `src/lib/git.ts`: one git interface; Tauri (local git) or GitHub API backend.
- `src-tauri/`: desktop shell (Rust).
- `CLAUDE/`: agent workspace (instructions, board, memory).
