-- Run in the Supabase SQL editor (Pattadon); safe to run again. Gives every signed-up user
-- (Google or email/password) a profile row that chat and tasks can join to.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- The GitHub login of users who signed in with GitHub (PLAN/2026-10-15-login-identity.md).
-- Only the identities trigger below writes it, from Supabase's GitHub identity, never from user
-- metadata (an email user can put anything in their own metadata).
alter table public.profiles add column if not exists github_login text;

alter table public.profiles enable row level security;

drop policy if exists "profiles readable by signed-in users" on public.profiles;
-- Real accounts only: anonymous sign-ins count as "authenticated" too (PLAN/2026-10-16-chat-privacy-get-started.md).
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- Users may change only their display name and photo; github_login stays as GitHub says.
revoke update on public.profiles from authenticated, anon;
grant update (name, avatar_url) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Email sign-up stores the name as full_name; with no name, show the part before the @.
  -- No email column: every signed-in user can read profiles.
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'user_name', ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- GitHub sign-in (Supabase's GitHub provider): when a GitHub identity is added to a user, at sign-up
-- or when an existing user links GitHub, store its login, and fill an empty name or photo.
create or replace function public.handle_github_identity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.provider = 'github' then
    insert into public.profiles (id) values (new.user_id) on conflict (id) do nothing;
    update public.profiles set
      github_login = nullif(new.identity_data->>'user_name', ''),
      name = coalesce(nullif(trim(name), ''), nullif(new.identity_data->>'full_name', ''), nullif(new.identity_data->>'user_name', '')),
      avatar_url = coalesce(avatar_url, nullif(new.identity_data->>'avatar_url', ''))
    where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_identity_saved on auth.identities;
create trigger on_auth_identity_saved
  after insert or update of identity_data on auth.identities
  for each row execute function public.handle_github_identity();

-- Fill github_login for GitHub identities that existed before this column.
update public.profiles p set github_login = i.identity_data->>'user_name'
from auth.identities i
where i.user_id = p.id and i.provider = 'github' and p.github_login is null;
