-- Chat privacy (PLAN/2026-10-16-chat-privacy-get-started.md): only real accounts (GitHub, email or Google) can
-- read chat, pin messages or read profiles. Run once in the Supabase SQL editor, after profiles.sql and schema.sql.
-- Safe to run again. Live on the team project (ahgwypotqzycuvnkggnw) since 2026-10-16 09:33 (UTC+7).
--
-- Why: anonymous sign-ins count as "authenticated" in Supabase, and the anon key is public (it ships in the site's
-- JavaScript). With the old rules (`using (true)`), anyone could sign in anonymously and read every chat.
--
-- Check it worked (not from the SQL editor, which runs as the owner): sign in anonymously with the anon key and
-- select from messages through the REST API; it must return no rows (GOTCHAS 2026-10-16).

-- 1. Restrictive rules are ANDed with every other rule on the table, so anonymous sessions are blocked even if
--    an older "read for everyone" policy exists. This is the part that closed the leak on the live project.
drop policy if exists "real accounts only (read)" on public.messages;
create policy "real accounts only (read)" on public.messages as restrictive for select to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

drop policy if exists "real accounts only (pin)" on public.messages;
create policy "real accounts only (pin)" on public.messages as restrictive for update to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

drop policy if exists "real accounts only (read)" on public.profiles;
create policy "real accounts only (read)" on public.profiles as restrictive for select to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- 2. The everyday rules themselves also leave anonymous sessions out (same as schema.sql and profiles.sql).
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

-- 3. What's on the tables now (expect the three "real accounts only" rows as RESTRICTIVE).
select tablename, policyname, permissive, cmd
from pg_policies
where schemaname = 'public' and tablename in ('messages', 'profiles')
order by 1, 2;

-- 4. Afterwards, once the members-only chat code is live: Authentication > Sign In / Providers >
--    turn off "Allow anonymous sign-ins".
