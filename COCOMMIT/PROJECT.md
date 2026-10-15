# Project: CoCommit

## What & why
CoCommit replaces the messy Discord-to-GitHub workflow with one platform. It makes git easy for beginners with interactive buttons instead of the terminal, and adds calls, chat, file sharing and a task assign/track system. It's for small teams, especially beginners, and must work on desktop and phone.

## Goals
- v1: a prototype that can be demoed and submitted at a hackathon.

## Stack
- **Approved 2026-10-15** (`PLAN/2026-10-15-stack.md`), as built: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 · GitHub REST API (no Octokit) · Supabase (auth, Postgres, Realtime) · Tauri 2 (desktop) · Vercel (hosting).
- **Not in the demo** (`PLAN/2026-10-15-demo-scope.md`): LiveKit calls, file sharing, task board (coming-soon pages), and phone install.
