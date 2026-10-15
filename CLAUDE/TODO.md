# Todo

<!-- Backlog and open questions. Not claimed work: when someone commits to an item, it becomes a task on BOARD/. Prune done items. -->

## Backlog
- [ ] Real end-to-end test of the git API once the OAuth keys exist: sign in, commit to a test repo, open a PR. (proud)
- [ ] `commitFiles` writes every file as mode `100644`, so committing an executable script drops its +x bit. Fine for the demo.
- [ ] Sign-in screen copy: say that GitHub's `repo` scope gives full access to your repos (needed for private repos). (Trin)

## Open questions
- Which hackathon and submission format? Deadline: 2026-10-16 11:30 (24 h from 2026-10-15 11:30). (Pattadon)
- What are the non-goals for v1? (Pattadon)
- A GitHub OAuth app may allow only one callback URL. Do we need two apps (localhost dev keys and Vercel prod keys)? Callback path: `/api/github/callback`. (Pattadon, accounts-and-keys)
- Should `feat/github-api` be split so Google sign-in (5d05bf3) and the git API get separate PRs? (proud, Pattadon)
