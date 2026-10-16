-- Chat privacy (PLAN/2026-10-16-chat-privacy-get-started.md): only real accounts (GitHub, email or Google) can
-- read chat, pin messages or read profiles. Run once in the Supabase SQL editor, after profiles.sql and schema.sql.
-- Safe to run again. schema.sql and profiles.sql now create the same rules, so a fresh setup doesn't need this file.
--
-- Why: anonymous sign-ins count as "authenticated" in Supabase, and the anon key is public (it ships in the site's
-- JavaScript). With the old rules (`using (true)`), anyone could sign in anonymously and read every chat.
-- To undo: re-run the old policies (`using (true)`) from git history.

drop policy if exists "messages readable by signed-in users" on public.messages;
create policy "messages readable by signed-in users"
  on public.messages for select to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

drop policy if exists "signed-in users can pin" on public.messages;
create policy "signed-in users can pin"
  on public.messages for update to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false)
  with check (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);
