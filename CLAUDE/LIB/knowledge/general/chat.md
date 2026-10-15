# Chat backend (`src/lib/chat.ts`)

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
`"use client"` screens import `@/lib/chat`. Chat is one Supabase Realtime channel per repo ("owner/name"). Without the Supabase keys it runs in fake mode (this browser only: `localStorage` plus `BroadcastChannel`, so two tabs can chat). The table, rules and Realtime setup are in `supabase/schema.sql`, which Pattadon runs once after `profiles.sql`.

## Details
- **Identity boundary (2026-10-15 inspection):** RLS binds `author_id` to the Supabase user, but the browser supplies the displayed `author` name. It does not prove GitHub identity or restrict reads/pins by repo membership. `/chat` still uses `GI-04/CoCommit` from `mock.ts`, independently of the Repo picker.
- **Who's talking (login identity, branch `kin/login-identity`, PLAN/2026-10-15-login-identity.md):** visitors who aren't logged in are signed in to Supabase anonymously so they can **read**; only real accounts (GitHub through Supabase, email or Google) can **post**: `canPost()` checks first, and the insert policy in `schema.sql` rejects anonymous users. The database sets `author` (profile name, else GitHub login) and `author_login` (verified GitHub login from `profiles.github_login`) in `chat-author.sql`, whatever the browser sends; the page shows `@login ✓`. "Change name" now links to `/profile` (`setMyName` and the `cocommit-chat-my-name` key are gone). `myName()` is only for presence/the "You:" line. Messages load with `select("*")` so chat works before `author_login` exists.
- **Don't import `github.ts` from browser code, even for types:** it made `next dev` reload two open tabs forever. Use `github-types.ts`.
- **Functions:** `loadMessages(repo, limit?)` (oldest first), `sendMessage(repo, text)`, `postGitEvent(repo, summary)`, `pinMessage(id, pinned?)`, `listPinned(repo, limit?)` (pinned messages, newest first, as `Activity` items for `COCOMMIT/LOG.md`), `subscribe(repo, onMessage)` and `onlineUsers(repo, onChange)` (both return a stop function), `myName()`, `setMyName(name)` (empty = automatic; returns the name now in use), `mergeMessage(list, m)` (add or replace by id, keeps order), `chatFake`.
- **Pin as decision / gotcha** (`src/lib/chat-pins.ts`): `saveAsDecision(repo, message, fields)` / `saveAsGotcha(...)` check that `COCOMMIT/CONTEXT.md` exists (else `NoWorkspaceError`), add the entry through `addDecisionTo` / `addGotchaTo` (`workspace.ts`), then pin the message. `decisionFields(m)` / `gotchaFields(m)` prefill the form. Needs GitHub login (it's a commit): 401 → show `signInHref("/chat")`.
- **Shape:** `ChatMessage = { id, repo, author, text, kind: "text" | "git_event", pinned, createdAt }`, the same as `mock.ts`.
- **Your own messages come back through `subscribe` too.** Always add with `mergeMessage`, so nothing shows twice.
- **Git events:** `github-client.ts` posts one after every `commitFiles`, `openPullRequest` and `writeContext`. The text ends with " · <GitHub URL>" of the commit or PR. If posting fails, it's ignored.
- **Rules (RLS):** signed-in users read everything and post only as themselves (`author_id` defaults to `auth.uid()`); `update` is granted on the `pinned` column only. `author` is the display name, stored at insert so Realtime payloads need no join. `supabase/chat-author.sql` (trigger): a poster with a profile name always posts under it; a guest using a member's name gets " (guest)". Tested on local Postgres with a stand-in auth schema (`pg-test` recipe in PLAN/2026-10-15-backend-polish.md).
- **Fake mode:** storage key `cocommit-chat-messages` (last 500); channels `cocommit-chat:<repo>` and `cocommit-online:<repo>`. Each tab gets its own guest name (`sessionStorage`). Clear the history with `localStorage.removeItem("cocommit-chat-messages")`.

## Sources
- `supabase/schema.sql`, `src/lib/chat.ts`, `src/app/chat/page.tsx`: the code
- Supabase Realtime docs (Postgres changes, Presence): https://supabase.com/docs/guides/realtime

**Last checked against sources:** 2026-10-15
