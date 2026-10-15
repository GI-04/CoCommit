# Account profile and settings

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
`/profile` is linked from the sidebar account chip. `src/lib/profile.ts` loads GitHub and Supabase sessions separately; fake GitHub users and anonymous Supabase users do not become editable accounts. No unified identity is assumed.

## Details
- `profileFromUser`, `loadAccounts`, `safeAvatar`, `saveProfile`, `changeEmail`, `changePassword`; browser code only. Supabase Auth `full_name` / `avatar_url` are canonical.
- Profile saves validate a trimmed 1–80-character name and an optional HTTPS avatar URL without embedded credentials. Blank avatar means initial fallback. `Avatar.tsx` falls back when an image fails and sends no referrer.
- Save auth metadata first, then mirror only name/avatar_url to the authenticated user's existing `profiles` row under existing RLS. Missing/failed mirror returns a partial-sync notice; the canonical profile remains saved. No new SQL required.
- Email/password controls appear only for server-provided email identities. Changes reauthenticate with current password; email confirmation state is displayed. Email/password never enter public profile rows.
- GitHub-only users see provider details and GitHub profile/settings links. Dual sessions show both accounts explicitly. GitHub OAuth does not have profile-write scope.
- `PROFILE_CHANGED` refreshes the sidebar; auth callbacks schedule reads after releasing the auth lock. `chat.myName()` resolves each time, preferring the real CoCommit profile, then GitHub, then guest. Existing messages/presence are not renamed.
- Sign-out attempts both sessions and reports either failure, including non-OK GitHub logout responses.
- Tests: `node --test tests/profile.test.mjs` (same command in zsh/PowerShell); 16 controlled boundary/render tests. Typecheck and Webpack build passed. Browser signed-out layout checked at 390×844 and 1280×900 with no errors. Live authenticated saves are still a manual check.

## Sources
- `src/lib/profile.ts`, `src/app/profile/page.tsx`, `src/components/Avatar.tsx`, `src/components/UserChip.tsx`
- `src/lib/auth-email.ts`, `src/lib/chat.ts`, `src/lib/github-client.ts`, `supabase/profiles.sql`
- `tests/profile.test.mjs`, `CLAUDE/OUTPUT/2026-10-15-account-profile.md`

**Last checked against sources:** 2026-10-15
