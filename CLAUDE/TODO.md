# Todo

<!-- Backlog and open questions. Not claimed work: when someone commits to an item, it becomes a task on BOARD/. Prune done items. -->

## Backlog
- [ ] Now that PR #42 is live: turn off Authentication → Sign In / Providers → "Allow anonymous sign-ins", then (optional) delete leftover anonymous users (`auth.users` where `is_anonymous`), including 6 throwaway ones from the 2026-10-16 privacy checks. `supabase/chat-privacy.sql` already ran (09:33). (Pattadon)
- [ ] Chat privacy, after `PLAN/2026-10-16-chat-privacy-get-started.md`: limit each repo's chat to people who can see that repo on GitHub (now any logged-in account can read any repo's chat by name), and make the who's-online presence channels private (Realtime private channels).
- [ ] Profile QA with a real signed-in account: save/reload name/photo, sidebar/future chat, email confirmation and password update. Implementation tested with fixtures; no live credentials changed. (Pattadon)
- [ ] Sign-in screen copy: say that GitHub's `repo` scope gives full access to your repos (needed for private repos). (Trin)

- [ ] `@cocommit` bot: add `ANTHROPIC_API_KEY` to `.env.local` and Vercel, then try a real question on `GI-04/CoCommit` (team status, a decision, today's chat). (Pattadon for Vercel; proud to test)
- [ ] `@cocommit` bot: no per-user rate limit yet; add one if the key is shared beyond the team.
- [ ] Tasks board: try one real task on `GI-04/CoCommit` (new → take → done) after it's merged; only tested against the mock GitHub. (proud)
- [ ] Tasks board, later: links to branches/PRs, live updates (Realtime or polling), drag and drop, editing a task's text.
- [ ] Drive: real GitHub already checked with `scripts/drive-live-check.mjs` (test repo `tiramisucake0127/cocommit-drive-test`, proud can delete it later). After `proud/drive-folders` is merged, try on the live site signed in: new folder, upload a >3 MB file (e.g. 10 MB), download it, delete the folder. Watch the join's time on Vercel (route `maxDuration` 60). (proud)
- [ ] Drive, later: move/rename files and folders, who uploaded and when, previews.
- [ ] `docs/LEGAL.md`: a Thai lawyer review before commercial use (liability cap, international transfers); before marketing to EU/UK users, check the Article 27 representative and each provider's DPF/SCCs. (Trin)
- [ ] Legal page in the app: a `/legal` page and footer/login link built from `docs/LEGAL.md` (needs a plan). Keep LEGAL.md current when data, providers, cookies or chat visibility change (e.g. `PLAN/2026-10-16-repo-members-only.md`). (Trin)

- [ ] Guide page, after it deploys: open https://cocommit.vercel.app/guide/git-for-beginner-teams, run Google's Rich Results Test (Article), and inspect the URL in Search Console once the site is verified there. (Trin)
- [ ] `src/components/Markdown.tsx`: turn off font ligatures in code spans like the guide does (GOTCHAS 2026-10-21). (Trin)
- [ ] More guides under `/guide/` (e.g. the "CoCommit vs GitHub Desktop" idea from PLAN/2026-10-21-seo-guide-page.md) only after the first one is indexed; `AppShell` and `proxy.ts` already cover `/guide/`, each new one needs `PUBLIC_PATHS` and the same tests. (Trin)

## Open questions
- Which hackathon and submission format? Deadline: submission 2026-10-16 14:00 (code freeze until 13:00; was 11:30). (Pattadon)
- What are the non-goals for v1? (Pattadon)
- A GitHub OAuth app may allow only one callback URL. Do we need two apps (localhost dev keys and Vercel prod keys)? Callback path: `/api/github/callback`. (Pattadon, accounts-and-keys)
