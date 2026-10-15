-- Chat: one channel per repo. Run once in the Supabase SQL editor (Pattadon), after profiles.sql.
-- Safe to re-run.
-- Also turn on Authentication > Sign In / Providers > "Allow anonymous sign-ins": with no app login
-- for the demo, chat signs people in anonymously (they still count as "authenticated" below).

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  repo text not null,                       -- "owner/name"
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author text not null,                     -- display name, stored so live updates need no lookup
  text text not null check (char_length(text) between 1 and 4000),
  kind text not null default 'text' check (kind in ('text', 'git_event')),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_repo_created_at on public.messages (repo, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages readable by signed-in users" on public.messages;
create policy "messages readable by signed-in users"
  on public.messages for select to authenticated using (true);

drop policy if exists "users post as themselves" on public.messages;
create policy "users post as themselves"
  on public.messages for insert to authenticated with check (author_id = auth.uid());

-- Anyone signed in can pin or unpin; the column grants below stop edits to anything else.
drop policy if exists "signed-in users can pin" on public.messages;
create policy "signed-in users can pin"
  on public.messages for update to authenticated using (true) with check (true);

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
