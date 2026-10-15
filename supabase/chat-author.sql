-- Chat: nobody can post under someone else's name. Run once in the Supabase SQL editor, after
-- profiles.sql and schema.sql. Safe to run again.
--
-- Before each new message is saved:
-- - If the poster has a profile name (Google or email login), the author becomes that name,
--   whatever the browser sent.
-- - If they don't (anonymous chat users, e.g. people signed in with GitHub only), they can't
--   take a registered member's name: " (guest)" is added to it.
-- Full identity linking (GitHub ↔ Supabase user) is part of the login-backend task.

create or replace function public.messages_set_author() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  mine text;
begin
  select nullif(trim(p.name), '') into mine from public.profiles p where p.id = auth.uid();
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
