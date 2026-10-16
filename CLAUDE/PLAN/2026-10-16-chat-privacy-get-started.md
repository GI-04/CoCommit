# Plan: Chat only for logged-in people; "Get started" goes to login when signed out

**Status:** active: approved by proud (2026-10-16 08:56, "แก้เลย"); built 09:05 on `proud/chat-privacy`, PR #42 open; SQL not run yet <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **By:** Claude-proud · **Asked by:** proud · **Needs OK from:** proud and the team (Pattadon runs the SQL; Trin owns the chat and landing pages) · **Superseded by:** —

## Why
proud's screen recording (2026-10-16 08:39) shows two problems after signing out:

1. **Get started opens `/home`, not the login page.** Sign-out itself works: `signOut()` in `src/lib/auth-email.ts` clears the Supabase session and the GitHub cookie, then goes to `/login`. But all three Get started buttons in `src/app/page.tsx` (lines 78, 95, 185) link straight to `/home`, and the login wall in `src/proxy.ts` is off for the demo (DECISIONS 2026-10-15).
2. **Signed out, `/chat` shows every past message. This is a data leak, not just a UI bug.**
   - `src/lib/chat.ts` signs every visitor in to Supabase anonymously (`ensureSession` → `signInAnonymously`).
   - In `supabase/schema.sql`, `messages` is readable by every `authenticated` user (`using (true)`). Anonymous users count as `authenticated`.
   - The anon key is public (it ships in the site's JavaScript). So anyone on the internet can read every chat, #general and every repo's (private repos too), straight from Supabase without opening the site.
   - Same gap: anonymous users can pin and unpin any message (the update policy has no anonymous check), and can read `profiles` (names, photos, GitHub logins).
   - After sign-out the browser still remembers the last repo (`localStorage` `cocommit-current-repo`), so the next person on that computer lands in that repo's chat.

**Not in this plan** (bigger, needs GitHub): limiting each repo's chat to people who can see that repo. After this fix, any logged-in account can still read a repo's chat if they know its name. Goes to TODO.

## Approach
### A. Database: closes the leak on its own, no deploy needed
New file `supabase/chat-privacy.sql` (safe to run again); Pattadon runs it in Supabase → SQL Editor. The same rules also go into `schema.sql` and `profiles.sql`, so a fresh setup gets them.
- `messages` select ("messages readable by signed-in users"): only real accounts, `using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false)`.
- `messages` pin ("signed-in users can pin"): the same check in `using` and `with check`.
- `profiles` select: the same check.

Realtime live messages follow the select rule, so anonymous browsers stop getting new messages too. With only A live, a signed-out visitor sees an empty chat, with no explanation until B is live.

### B. Code
1. `src/lib/chat.ts`: no more anonymous sign-in. `ensureSession` becomes "needs a real account": with no session, or an anonymous one left over from before, `loadMessages`, `listPinned` and `pinMessage` stop with a "Log in to see the team chat" error, and `subscribe` / `onlineUsers` don't join. Fake mode (no Supabase keys) doesn't change. Update the header comment and `LOGIN_TO_CHAT`.
2. `src/app/chat/page.tsx` (Trin's area): when signed out (`canPost()` is false), load nothing. Show one card, "Log in to see and join the team chat", with a login button (`/login?returnTo=/chat`) in place of the message list. The online list stays empty.
3. `src/components/CallChat.tsx`: the same signed-out message (calls already need a login).
4. `src/lib/current-repo.ts`: add `clearCurrentRepo()`. `signOut()` in `src/lib/auth-email.ts` calls it, so a signed-out browser goes back to the demo repo.
5. Get started: new client component `src/components/landing/GetStarted.tsx`. It links to `/login?returnTo=/home` and switches to `/home` once it sees you're signed in (a Supabase account that isn't anonymous, or a GitHub session from `getSession()`). `src/app/page.tsx` uses it for all three buttons, with the same styles. "Open the app" in the footer stays `/home`, so people can still look around without an account.
6. Tests: `tests/current-repo.test.mjs` covers `clearCurrentRepo`. If `chat.ts` loads in a test the way other lib files do, add `tests/chat-access.test.mjs`: with a fake Supabase client and no session (or an anonymous one), `loadMessages` refuses and never calls `signInAnonymously`. Otherwise the browser checks cover it.
7. Notes: LIB `chat` (rules, no anonymous reading) and `landing-page` (Get started), README if it says anyone can read chat, DECISIONS (supersedes the "chat signs in to Supabase anonymously" part of the 2026-10-15 entry), GOTCHAS (mark the leak fixed), TODO.

### C. After B is live (Pattadon)
Turn off Authentication → Sign In / Providers → "Allow anonymous sign-ins". Do this only after B is live: the old code shows "Chat needs Anonymous sign-ins turned on" to signed-out visitors.

## As built (2026-10-16 09:05)
- B3: `CallChat.tsx` needed no change: with the new `chat.ts` it already shows the login message (calls need a login anyway).
- B5: the rule lives in `getStartedHref` in `src/lib/login-identity.ts` (pure, tested); the three buttons share one check.
- Tests: `tests/chat-access.test.mjs` (new; it fails against the old `chat.ts`), plus `current-repo`, `login-identity` and `profile` tests. 98/98.

## Files touched
- `supabase/chat-privacy.sql` (new), `supabase/schema.sql`, `supabase/profiles.sql`: the rules above
- `src/lib/chat.ts`: real account required to read, pin and listen
- `src/app/chat/page.tsx`, `src/components/CallChat.tsx`: signed-out card
- `src/lib/current-repo.ts`, `src/lib/auth-email.ts`: forget the last repo on sign-out
- `src/components/landing/GetStarted.tsx` (new), `src/app/page.tsx`: Get started link
- `tests/current-repo.test.mjs`, maybe `tests/chat-access.test.mjs` (new)
- `CLAUDE/LIB/knowledge/general/chat.md`, `landing-page.md`, `CLAUDE/LIB/pointers/general.json`, `DECISIONS.md`, `GOTCHAS.md`, `TODO.md`, `LOG.md`, `HANDOFF.md`; `README.md` if needed

## Risks / needs OK
- **Demo timing (code freeze 09:30; merging to `main` deploys).** Signed-out visitors won't see chat anymore. The presenter is signed in, so the demo script (sign in → commit → event in chat) still works. The team decides: run the SQL (A) now or after the demo; merge the code (B) before 09:30 or after.
- **A changes the live database:** only Pattadon runs it. To undo, re-run the old policies from `supabase/schema.sql` and `profiles.sql`.
- **Trin's area:** `src/app/chat/page.tsx` and the landing page. Trin should glance at the change.
- **Old GitHub sign-in fallback:** someone signed in only through our own GitHub OAuth (no Supabase account) couldn't read chat. On the live site GitHub sign-in goes through Supabase (`/api/github/login`, provider on), so nobody should be in that state; logging in again fixes it.
- **Still open after this plan:** the who's-online presence channels stay open to anyone with the anon key (display names only); fixing that needs Realtime private channels. Goes to TODO.

## Branch
`proud/chat-privacy` from `origin/main`, in its own worktree, because other chats have uncommitted edits in the main folder. Commit, push and PR only when proud says so.

## How we'll verify
- `npm run typecheck`, `npm test`, `npm run build` pass.
- Browser, locally with the Supabase keys, signed out: Get started on `/` → `/login`; `/chat` shows the login card, makes no requests to `messages` and no anonymous sign-up, no console errors. After sign-out, `/chat` opens with the demo repo, not the last one.
- Browser, signed in: Get started → `/home`; chat loads, posts, updates live and pins as before.
- After A runs: in a private window, the old live site (anonymous) shows no chat messages; a signed-in account still sees them.
