# Plan: Chat backend (Supabase Realtime)

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **By:** Claude-proud · **Task:** `BOARD/Taken/2026-10-15-chat-backend.md` (on `main`) · **Superseded by:** —

## Why
The Chat screen runs on fake data (`src/lib/mock.ts`). This makes it real: one live channel per repo, who's online, pinned messages, and git events (commits, PRs) posted automatically.

## Branch
`feat/chat-backend`, made from `feat/github-api`, because chat needs its Supabase client (`src/lib/supabase.ts`), the Google login (who's talking) and `github-client.ts` (git events). Step 1 merges `main` in, to get the Chat screen fix and `context.ts`. Three notes files conflict (`GOTCHAS`, `HANDOFF`, `LOG`); keep both sides. PR order: `feat/github-api` first, then this.

## Files
- `supabase/schema.sql` (new): the `messages` table, its access rules, and Realtime. Pattadon runs it once in the Supabase SQL editor, like `profiles.sql`.
- `src/lib/chat.ts` (new, browser code): the chat functions. **Not** in `supabase.ts` as the task says, because that file is now the shared Supabase client from Google sign-in; `chat.ts` imports it. I'll update the task's Scope.
- `src/lib/github-client.ts` (mine): after a commit or PR succeeds, post a git event to chat automatically (if posting fails, the commit still counts).

## Table `messages`
`id` uuid · `repo` text ("owner/name") · `author_id` uuid (defaults to the signed-in user) · `author` text (display name, stored so live updates need no extra lookup) · `text` (1–4000 chars) · `kind` (`text` | `git_event`) · `pinned` boolean · `created_at`.
Rules (RLS): signed-in users can read all messages; they can only post as themselves; anyone signed in can pin or unpin, but nobody can edit a message's text (`update` allowed on the `pinned` column only). Realtime is turned on for the table.

## Functions (`src/lib/chat.ts`)
Same shape as `ChatMessage` in `mock.ts`: `{ id, repo, author, text, kind, pinned, createdAt }`.
- `loadMessages(repo, limit = 100)`: history for the first load. New; the task didn't list it, but the screen needs it.
- `sendMessage(repo, text)`
- `subscribe(repo, onMessage)`: new messages and pin changes, live; returns a function that stops listening.
- `postGitEvent(repo, summary)`
- `pinMessage(id, pinned = true)`: `false` unpins (the screen has a toggle).
- `onlineUsers(repo, onChange)`: who's online, live (Realtime Presence); returns a stop function. The task wrote `onlineUsers(repo)`, but "online" changes over time, so it takes a callback.
- `myName()`: the signed-in user's name, to replace `me` in `mock.ts`.

## Change 2026-10-15: no app login for the demo
Pattadon asked for GitHub sign-in only (board task `open-pr-github-api`), so `proxy.ts` no longer forces the Google login (`REQUIRE_GOOGLE_LOGIN=true` turns it back on). Chat now signs in to Supabase **anonymously** (once per browser, before any read or write) so the table rules still apply, and the name shown is the GitHub account (then a Google login, then a per-tab guest name). Pattadon turns on "Allow anonymous sign-ins" in Supabase. Approved by proud (option A).

## Fake mode (no Supabase keys)
Messages are kept in the browser (`localStorage`) and shared live between tabs (`BroadcastChannel`). Two tabs on the same computer see each other instantly, and "online" shows the open tabs. The screen and the demo work before the keys exist; it switches to Supabase by itself once `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

## Chat screen (`src/app/chat/page.tsx`, Trin's file): choose one
- **A (chosen by proud 2026-10-15):** I wire it myself (swap `@/lib/mock` for `@/lib/chat`; the layout stays the same) and tell Trin. Without it the acceptance ("two browsers see each other's messages") can't be shown, and the screen is small.
- **B:** I post a board task for Trin, as with the Repo screen.

## Verify
- `npm run typecheck` clean.
- Fake mode in the browser, two tabs: a message shows up in the other tab right away, pin/unpin syncs, online shows 2, and a fake commit through `github-client` appears as a git event.
- Real Supabase: two browsers signed in with Google. This waits for the Supabase keys and for `schema.sql` to be run (Pattadon).

## Risks
- If `schema.sql` isn't run, or Realtime isn't on for the table, messages only show after a refresh.
- Which repo the chat is for: the screen uses the first repo for now; a shared "current repo" between Repo and Chat is a screen decision (Trin).
- ~~Kin hasn't confirmed giving this task to proud.~~ Confirmed by Kin (dcc7463).
