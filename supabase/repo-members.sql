-- Repo chats for repo members only (PLAN/2026-10-16-repo-members-only.md). Run once in the Supabase SQL editor,
-- after schema.sql and chat-privacy.sql. Safe to run again.
--
-- Order matters: run this only AFTER (1) the code with /api/chat/join is live and (2) SUPABASE_SERVICE_ROLE_KEY is
-- set in Vercel. Before that nobody gets a repo_members row, so every repo chat would look empty.
--
-- How it works: when you open a repo's chat, our server asks GitHub whether you can see that repo and, if so,
-- records (you, repo, now) in repo_members with the service role key. Only the server writes this table. The rules
-- below let you read, post and pin in a repo chat only with a row checked in the last 24 hours, so someone removed
-- from the GitHub repo loses the chat within a day. The team-wide chat (repo = 'general') stays open to every real
-- account. Calls are checked on the server (/api/livekit-token) and need nothing here.

-- 1. Who has been checked as a member of which repo.
create table if not exists public.repo_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  repo text not null,                       -- "owner/name", exactly as messages.repo
  checked_at timestamptz not null default now(),
  primary key (user_id, repo)
);

alter table public.repo_members enable row level security;
revoke all on public.repo_members from anon, authenticated;
grant select on public.repo_members to authenticated;

drop policy if exists "read your own memberships" on public.repo_members;
create policy "read your own memberships" on public.repo_members for select to authenticated
  using (user_id = auth.uid());

-- 2. The check the chat rules use. security definer so it can read repo_members without going through its rules.
create or replace function public.is_repo_member(r text) returns boolean
  language sql stable security definer set search_path = public
as $$
  select r = 'general' or exists (
    select 1 from public.repo_members m
    where m.user_id = auth.uid() and m.repo = r and m.checked_at > now() - interval '24 hours'
  );
$$;
revoke all on function public.is_repo_member(text) from public;
grant execute on function public.is_repo_member(text) to authenticated;

-- 3. Restrictive rules are ANDed with the existing ones (schema.sql, chat-privacy.sql): real account AND member.
--    Live updates (Realtime) follow the read rule, so non-members get no new messages either.
drop policy if exists "repo members only (read)" on public.messages;
create policy "repo members only (read)" on public.messages as restrictive for select to authenticated
  using (public.is_repo_member(repo));

drop policy if exists "repo members only (post)" on public.messages;
create policy "repo members only (post)" on public.messages as restrictive for insert to authenticated
  with check (public.is_repo_member(repo));

drop policy if exists "repo members only (pin)" on public.messages;
create policy "repo members only (pin)" on public.messages as restrictive for update to authenticated
  using (public.is_repo_member(repo));

-- 4. What's on the tables now (expect the three "repo members only" rows as RESTRICTIVE).
select tablename, policyname, permissive, cmd
from pg_policies
where schemaname = 'public' and tablename in ('messages', 'repo_members')
order by tablename, policyname;
