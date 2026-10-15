-- Chat: nobody can post under someone else's name. Run once in the Supabase SQL editor, after
-- profiles.sql and schema.sql. Safe to run again.
--
-- Before each new message is saved (whatever the browser sent):
-- - author becomes the poster's profile name (GitHub, Google or email login), or their GitHub login;
-- - author_login becomes their verified GitHub login (profiles.github_login), or null.
-- - Anyone without a profile name (only possible if anonymous posting is ever allowed again) can't
--   take a registered member's name: " (guest)" is added to it.
-- Anonymous visitors can't post at all: see the insert policy in schema.sql.
-- Run after profiles.sql and schema.sql (it needs profiles.github_login and messages.author_login).

create or replace function public.messages_set_author() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  mine text;
  login text;
begin
  select coalesce(nullif(trim(p.name), ''), p.github_login), p.github_login
    into mine, login
    from public.profiles p where p.id = auth.uid();
  new.author_login := login;
  if mine is not null then
    new.author := mine;
  elsif exists (
    select 1 from public.profiles p
    where p.id is distinct from auth.uid()
      and nullif(trim(p.name), '') is not null
      and lower(trim(p.name)) = lower(trim(new.author))
  ) then
    new.author := trim(new.author) || ' (guest)';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_set_author on public.messages;
create trigger messages_set_author
  before insert on public.messages
  for each row execute function public.messages_set_author();
