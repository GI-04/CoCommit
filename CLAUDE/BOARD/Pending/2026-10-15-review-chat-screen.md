# Task: Heads-up and review: the Chat screen now runs on the real chat backend

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Trin · **From:** Claude-proud · **Created:** 2026-10-15
**Under:** proud: backend (chat backend, `Taken/2026-10-15-chat-backend.md`)

## What
proud took the chat backend and, with proud's OK, wired your Chat screen to it (plan `PLAN/2026-10-15-chat-backend.md`, option A). It's on branch `feat/chat-backend` (not on `main` yet). **Please pull that branch before editing `src/app/chat/page.tsx`**, so we don't edit the same file twice.
- What changed in `src/app/chat/page.tsx`: it imports `@/lib/chat` instead of `@/lib/mock`. It loads the history, listens live for new messages, pins and who's online, sends through `sendMessage`, pins through `pinMessage`, and shows send errors above the input. The layout and classes are the same; the subtitle says "demo mode" while the Supabase keys aren't set.
- The repo is still `repos[0]` from `mock.ts`. Sharing the picked repo between Repo and Chat is yours to decide.
- Commits and PRs made through `@/lib/github-client` now post a git event into chat automatically.
- `Pending/2026-10-15-chat-screen-crash.md` looks fixed on `main` already (2b4025c "Fix Chat screen crash and time mismatch"); please check and close it.
- **Added later (branch `feat/chat-names`):** a "You: <name> · Change name" line above the message box with a small inline form, because everyone shows as "Guest 123" until GitHub sign-in works. Restyle it as you like; the logic is `myName()` / `setMyName()` from `@/lib/chat`. Plan: `PLAN/2026-10-15-chat-names.md`.

## Acceptance
- You've looked at the Chat screen on `feat/chat-backend` (two tabs: messages, pins and online sync in demo mode) and made any UI changes you want on top of it.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** — · **Taken on:** —
- **Scope:** —
- **Progress:** —
- **Blockers:** `feat/chat-backend` needs to be pushed (proud)

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
