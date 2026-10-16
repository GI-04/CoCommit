# Plan: Chat groups with invites

<!-- Filename: YYYY-MM-DD-<slug>.md. Never delete a plan: set its status instead. -->

**Status:** proposed <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **By:** Claude-Kin (for Kin) · **Superseded by:** —

## Why
Chat today has only `# general` (everyone with an account) and one room per GitHub repo (members only since `PLAN/2026-10-16-repo-members-only.md`). Nobody can **make their own group and invite people**, like a Discord server or a LINE group. Kin wants that, so a team (or part of one) can talk without a repo, and email/Google accounts get more than `# general`. It was on the after-demo list as "user-created chats".

## What people get
- **New group:** give it a name; you're its owner.
- **Invite, two ways:**
  - **Invite link:** "Copy invite link" (`https://cocommit.vercel.app/join/<code>`). Anyone with an account who opens it joins. Links expire after 7 days by default and can be limited to N uses; the owner can turn a link off.
  - **Invite by name:** search people by their CoCommit name or GitHub login, send an invite; they see "Invites (1)" in the chat list and **Accept** or **Decline**.
- **In a group:** the same chat as today (live messages, pins, who's online, git events don't apply). Members list; anyone can leave.
- **Owner only:** rename, remove a member, delete the group (deletes its messages).
- Groups are not tied to git, so they work for email and Google accounts too.

## Approach
Branch `kin/chat-groups`; one PR (merging deploys). Backend is Kin's area; the screens are Trin's (Trin agrees on them first).

**Database (`supabase/chat-groups.sql`, new, re-runnable; safe to run before the code is live, it only adds):**
1. Tables: `chat_groups (id, name 1–60 chars, owner_id, created_at)`, `group_members (group_id, user_id, role owner|member, joined_at)`, `group_invites (code, group_id, created_by, invited_user_id null for links, expires_at, max_uses, uses, revoked)`.
2. Group messages live in the existing `messages` table with `repo = 'group:<group id>'`, so live updates, pins, presence and `chat-author.sql` keep working unchanged. `public.is_repo_member` (from `repo-members.sql`) learns one more case: `group:<id>` is allowed when you're a member of that group.
3. Rules: you can see a group, its members and its invites only if you're a member (invited users see their own pending invite). **No direct writes:** every change goes through small database functions (`security definer`) that check who's asking: `create_group`, `create_invite_link`, `invite_user`, `join_with_code`, `accept_invite` / `decline_invite`, `leave_group`, `remove_member`, `rename_group`, `delete_group`, `revoke_invite`. No new server key needed.
4. Limits: 50 members per group, 20 groups per person, invite codes of 22 random URL-safe characters, anonymous sessions refused everywhere.

**App:**
5. `src/lib/groups.ts` (new, browser): list my groups and pending invites, and wrappers for the functions above, with plain-language errors ("This invite has expired", "This group is full").
6. `src/lib/chat.ts`: `group:<id>` rooms skip the GitHub check (`/api/chat/join` is for repos only); the database rules decide.
7. `src/lib/current-repo.ts` (or a small `chat-rooms.ts`): helpers to tell `general`, a repo and `group:<id>` apart.
8. Screens (Trin's area): a **Groups** section and **New group** in the chat list, an **Invites (n)** row, a group menu (Invite, Members, Leave; Rename / Delete for the owner), an invite dialog (copy link, invite by name), and a join page `src/app/join/[code]/page.tsx` (sign in first if needed, then join and open the group). Decision / Gotcha and `@cocommit` stay hidden in groups, as in `# general` (they write to a repo).

**Not in this plan:** calls per group (LiveKit rooms are per repo), roles beyond owner/member, message editing or deleting, group avatars, notifications.

## Files touched
- `supabase/chat-groups.sql` (new); `supabase/repo-members.sql` (the `is_repo_member` function also accepts group rooms)
- `src/lib/groups.ts` (new), `src/lib/chat.ts`, `src/lib/current-repo.ts`
- `src/app/chat/page.tsx`, `src/app/join/[code]/page.tsx` (new), maybe `src/components/` for the dialogs (Trin)
- `tests/groups.test.mjs` (new), `scripts/check-chat-groups.mjs` (new, live check), README, LIB `chat`

## Risks / needs OK
- **Pattadon:** OK the plan; run `supabase/chat-groups.sql` in Supabase (any time before the merge; it only adds).
- **Trin:** agree on the screens (chat list, menus, join page) before they're built, since chat page is Trin's area.
- Touches chat right after the members-only work: the `is_repo_member` change must keep repo rooms exactly as they are (tests cover it).
- Invite links are bearer links: anyone who gets one can join until it expires or is turned off. That's how Discord/LINE links work; the owner can revoke.
- Merging deploys.

## How we'll verify
- `npm run typecheck`, `npm test` (groups.ts with a fake Supabase: create, invite, join, expired/used/revoked links, full group, leave, owner-only actions), `npm run build`.
- Live, after the SQL, with two accounts: A creates a group and sends a link; B joins and they chat live; a third account C (not invited) reads 0 messages for that group (check script) and can't open the link after A turns it off; A removes B and B loses access; repo chats and `# general` work as before.
