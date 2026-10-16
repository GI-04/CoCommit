-- Chat: one channel per repo. Run once in the Supabase SQL editor (Pattadon), after profiles.sql.
-- Safe to re-run.
-- Only real accounts (GitHub, email or Google) can read, post or pin. Anonymous sign-ins count as
-- "authenticated" in Supabase, so every rule below also checks the is_anonymous claim
-- (PLAN/2026-10-16-chat-privacy-get-started.md). Chat no longer signs visitors in anonymously.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  repo text not null,                       -- "owner/name"
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author text not null,                     -- display name, set by the database (chat-author.sql)
  text text not null check (char_length(text) between 1 and 4000),
  kind text not null default 'text' check (kind in ('text', 'git_event')),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- Verified GitHub login of the poster, set by the database (chat-author.sql); null for email/Google users.
alter table public.messages add column if not exists author_login text;

create index if not exists messages_repo_created_at on public.messages (repo, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages readable by signed-in users" on public.messages;
create policy "messages readable by signed-in users"
  on public.messages for select to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

drop policy if exists "users post as themselves" on public.messages;
-- Only real accounts post (GitHub, email or Google).
create policy "users post as themselves"
  on public.messages for insert to authenticated
  with check (author_id = auth.uid() and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- Anyone with a real account can pin or unpin; the column grants below stop edits to anything else.
drop policy if exists "signed-in users can pin" on public.messages;
create policy "signed-in users can pin"
  on public.messages for update to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false)
  with check (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

revoke update on public.messages from authenticated, anon;
grant update (pinned) on public.messages to authenticated;

-- Live updates (inserts and pin changes) through Supabase Realtime.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
