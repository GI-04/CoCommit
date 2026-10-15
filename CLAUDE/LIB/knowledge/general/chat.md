# Chat backend (`src/lib/chat.ts`)

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
`"use client"` screens import `@/lib/chat`. Chat is one Supabase Realtime channel per repo ("owner/name"). Without the Supabase keys it runs in fake mode (this browser only: `localStorage` plus `BroadcastChannel`, so two tabs can chat). The table, rules and Realtime setup are in `supabase/schema.sql`, which Pattadon runs once after `profiles.sql`.

## Details
- **Identity boundary (2026-10-15 inspection):** RLS binds `author_id` to the Supabase user, but the browser supplies the displayed `author` name. It does not prove GitHub identity or restrict reads/pins by repo membership. `/chat` still uses `GI-04/CoCommit` from `mock.ts`, independently of the Repo picker.
- **Who's talking (no app login for the demo):** before any read or write, chat signs in to Supabase anonymously (once per browser; "Allow anonymous sign-ins" must be on). The name is now the real Supabase account’s saved full_name/name (email prefix fallback), else GitHub from `/api/github/getSession` (ignored in GitHub fake mode), else a per-tab guest name. `myName()` resolves on each send so profile edits affect future messages; existing messages/presence are not rewritten. The Google login wall is off unless `REQUIRE_GOOGLE_LOGIN=true`.
- **Don't import `github.ts` from browser code, even for types:** it made `next dev` reload two open tabs forever. Use `github-types.ts`.
- **Functions:** `loadMessages(repo, limit?)` (oldest first), `sendMessage(repo, text)`, `postGitEvent(repo, summary)`, `pinMessage(id, pinned?)`, `listPinned(repo, limit?)` (pinned messages, newest first, as `Activity` items for `COCOMMIT/LOG.md`), `subscribe(repo, onMessage)` and `onlineUsers(repo, onChange)` (both return a stop function), `myName()`, `mergeMessage(list, m)` (add or replace by id, keeps order), `chatFake`.
- **Shape:** `ChatMessage = { id, repo, author, text, kind: "text" | "git_event", pinned, createdAt }`, the same as `mock.ts`.
- **Your own messages come back through `subscribe` too.** Always add with `mergeMessage`, so nothing shows twice.
- **Git events:** `github-client.ts` posts one after every `commitFiles`, `openPullRequest` and `writeContext`. If posting fails, it's ignored.
- **Rules (RLS):** signed-in users read everything and post only as themselves (`author_id` defaults to `auth.uid()`); `update` is granted on the `pinned` column only. `author` is the display name, stored at insert so Realtime payloads need no join.
- **Fake mode:** storage key `cocommit-chat-messages` (last 500); channels `cocommit-chat:<repo>` and `cocommit-online:<repo>`. Each tab gets its own guest name (`sessionStorage`). Clear the history with `localStorage.removeItem("cocommit-chat-messages")`.

## Sources
- `supabase/schema.sql`, `src/lib/chat.ts`, `src/app/chat/page.tsx`: the code
- Supabase Realtime docs (Postgres changes, Presence): https://supabase.com/docs/guides/realtime

**Last checked against sources:** 2026-10-15
