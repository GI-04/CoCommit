# Plan: Backend polish before the demo (no frontend)

**Status:** done <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **By:** Claude-proud · **Task:** none (proud: "ทำให้หมดเลย", 2026-10-15 ~21:45) · **Superseded by:** —

## Why
Five small backend/doc items that make the live demo work end to end, without touching screens.

## Items
1. **Team context for `GI-04/CoCommit`:** generate the `COCOMMIT/` workspace with `setupWorkspace` (`src/lib/context.ts`) from our real `CLAUDE/PROJECT.md` and `CLAUDE/COLLAB.md`, and commit it in this branch, so Pin as decision/gotcha and the activity log work on the live site once merged. **Leave out** the `CLAUDE.md` / `AGENTS.md` pointer lines: this repo's own agents already use `CLAUDE/`, and a second instruction file would confuse them. Easy to add later.
2. **Links in git events:** `github-client.ts` adds the commit or PR URL to the chat git event text. No screen change (the URL shows as text; a link would need a frontend change).
3. **No posting as someone else (part of login-backend item 2):** `supabase/chat-author.sql`, a `before insert` trigger on `messages`. If the poster has a profile name (Google or email login), the author is set to it. If they don't (anonymous, e.g. GitHub-only), they can't use a registered member's name: it gets " (guest)" appended. Tested on a local Postgres with a stand-in `auth` schema; someone with Supabase access runs it once.
4. **Demo script + pre-stage checklist:** `CLAUDE/OUTPUT/…-demo-script.md`.
5. **API guide for the team:** `docs/API.md` (git API, chat, activity feed, pins, workspace, rules), plus one link from the README.

## Verify
`npm run typecheck`, `npm test`, `npm run build`; the SQL on local Postgres; the git-event text in the browser (fake mode).

## Results 2026-10-15 22:00
- Typecheck, `npm test` (16 passed) and build pass.
- `COCOMMIT/` generated with the app's own `setupWorkspace` from `CLAUDE/PROJECT.md` + `CLAUDE/COLLAB.md` (10 members); no `CLAUDE.md` / `AGENTS.md` pointer lines.
- `supabase/chat-author.sql` on a throwaway local Postgres (`initdb --locale=C`, TCP on 127.0.0.1:54329; stand-in `auth.users`, `auth.uid()` from `current_setting('test.uid')`, roles `authenticated`/`anon`, a `supabase_realtime` publication), then `profiles.sql`, `schema.sql`, and `chat-author.sql` twice: member sending "Kin" → stored "Proud"; anonymous "kin " → "kin (guest)"; anonymous unused name → unchanged; forged `author_id` → RLS error.
- Git-event links: text change only (typechecked); not clicked through in a browser.
