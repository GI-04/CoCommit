# Plan: Repo chat and calls for repo members only

<!-- Filename: YYYY-MM-DD-<slug>.md. Never delete a plan: set its status instead. -->

**Status:** proposed <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **By:** Claude-Kin (for Kin) · **Superseded by:** —

## Why
Today any real account can read and post in **any** repo's chat and join **any** repo's call, just by knowing the repo name (`owner/name`). The rules only check "signed in, not anonymous" (`supabase/schema.sql`, `chat-privacy.sql`; `src/app/api/livekit-token/route.ts`). For a private repo that leaks the team's talk to strangers. This is the open TODO "limit each repo's chat to people who can see that repo on GitHub" and HANDOFF Calls "Next 3".

**Rule after this plan:** you can use a repo's chat and call only if GitHub says you can see that repo. `# general` stays open to every real account.

## Approach
**After the code freeze (13:00), and not merged before the 14:00 submission without the team's OK.** Branch `kin/repo-members-only`.

**Calls (server only, simple):**
1. In `/api/livekit-token`, before handing out a token for a repo room: ask GitHub `GET /repos/{owner}/{name}` with the caller's GitHub token (the existing `gh()` helper in `src/lib/github.ts`, through a new small `canSeeRepo(repo)`). 200 → token; 404/403 → 403 "You're not a member of this repo." No GitHub sign-in (email/Google accounts) → 403 "Sign in with GitHub to join this repo's call."
2. Fake/local mode keeps working as today.

**Chat (database, because the browser reads Supabase directly):**
3. New table `public.repo_members (user_id, repo, checked_at)`. **Only our server writes it**, with the Supabase **service role key** (new, server-only env var `SUPABASE_SERVICE_ROLE_KEY`; never sent to the browser).
4. New route `POST /api/chat/join {repo}`: checks `canSeeRepo(repo)` with the caller's GitHub token, then records (user, repo, now). The chat page calls it when you open a repo chat; if it says no, the page shows "You're not a member of this repo" (or "Sign in with GitHub…") instead of the messages.
5. New SQL `supabase/repo-members.sql` (re-runnable): the table with RLS (users can read only their own rows, no writes), plus **restrictive** policies on `messages` for select / insert / update: allowed when `repo = 'general'` **or** there is a `repo_members` row for `auth.uid()` and that repo checked in the last 24 hours. So someone removed from the GitHub repo loses chat access within a day.
6. Realtime follows the same select rule, so live messages stop too. Presence (who's online) isn't covered by RLS; it shows names only, no messages. Noted as a gap.

**Tests:** unit tests for `canSeeRepo` answers (200/404/403/not signed in) and the join route with a fake GitHub; `npm test`, typecheck, build. A SQL check script like `scripts/check-chat-privacy.mjs`: a real account without a `repo_members` row reads 0 messages for a repo.

## Files touched
- `src/lib/github.ts` (+`canSeeRepo`), `src/app/api/livekit-token/route.ts`
- `src/app/api/chat/join/route.ts` (new), `src/lib/supabase-admin.ts` (new, server-only service-role client)
- `src/lib/chat.ts` (+`joinRepoChat`), `src/app/chat/page.tsx` (Trin's area: one "not a member" state; Trin to glance)
- `supabase/repo-members.sql` (new), `.env.example`, `scripts/check-env.mjs` (new var name, no value)
- `tests/repo-members.test.mjs` (new), README, LIB `chat` / `calls`

## Risks / needs OK
- **Pattadon:** OK the plan; put `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Production) and `.env.local`; run `supabase/repo-members.sql` **after** the code is live (before that, repo chats would go empty for everyone).
- **Email/Google accounts lose repo chats and calls** (they have no GitHub token to prove membership); they keep `# general`, Drive is unchanged. Is that OK for the product? Alternative: let them in, but then anyone could read a private repo's chat again.
- The service role key bypasses all database rules: it lives only on the server, used in one route.
- One extra GitHub request when opening a repo chat or joining a call.
- Merging deploys; touches chat right after the chat-privacy work (proud's area too: proud to glance).

## How we'll verify
- `npm run typecheck`, `npm test`, `npm run build`.
- Live, after the SQL: a member opens `GI-04/CoCommit` chat and the call → works; a real account that is **not** a member (a spare GitHub account) → "not a member", the check script reads 0 messages, the call token request returns 403; `# general` still works for both; an email account sees `# general` only.

- Approved, Signed Pattadon Yuttaworawit
