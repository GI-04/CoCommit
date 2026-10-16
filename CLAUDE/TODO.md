# Todo

<!-- Backlog and open questions. Not claimed work: when someone commits to an item, it becomes a task on BOARD/. Prune done items. -->

## Backlog
- [ ] Profile QA with a real signed-in account: save/reload name/photo, sidebar/future chat, email confirmation and password update. Implementation tested with fixtures; no live credentials changed. (Pattadon)
- [ ] Sign-in screen copy: say that GitHub's `repo` scope gives full access to your repos (needed for private repos). (Trin)

- [ ] `@cocommit` bot: add `ANTHROPIC_API_KEY` to `.env.local` and Vercel, then try a real question on `GI-04/CoCommit` (team status, a decision, today's chat). (Pattadon for Vercel; proud to test)
- [ ] `@cocommit` bot: no per-user rate limit yet; add one if the key is shared beyond the team.
- [ ] Tasks board: try one real task on `GI-04/CoCommit` (new → take → done) after it's merged; only tested against the mock GitHub. (proud)
- [ ] Tasks board, later: links to branches/PRs, live updates (Realtime or polling), drag and drop, editing a task's text.
- [ ] Drive: real GitHub already checked with `scripts/drive-live-check.mjs` (test repo `tiramisucake0127/cocommit-drive-test`, proud can delete it later). After `proud/drive-folders` is merged, try on the live site signed in: new folder, upload a >3 MB file (e.g. 10 MB), download it, delete the folder. Watch the join's time on Vercel (route `maxDuration` 60). (proud)
- [ ] Drive, later: move/rename files and folders, who uploaded and when, previews.

## Open questions
- Which hackathon and submission format? Deadline: 2026-10-16 11:30 (24 h from 2026-10-15 11:30). (Pattadon)
- What are the non-goals for v1? (Pattadon)
- A GitHub OAuth app may allow only one callback URL. Do we need two apps (localhost dev keys and Vercel prod keys)? Callback path: `/api/github/callback`. (Pattadon, accounts-and-keys)
