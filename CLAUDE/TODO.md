# Todo

<!-- Backlog and open questions. Not claimed work: when someone commits to an item, it becomes a task on BOARD/. Prune done items. -->

## Backlog
- [ ] Landing page (live): check in the real desktop app that it opens on `/home` (Tauri redirect). Consider route groups after the demo if the AppShell check gets in the way. (Pattadon)
- [ ] Profile QA with a real signed-in account: save/reload name/photo, sidebar/future chat, email confirmation and password update. Implementation tested with fixtures; no live credentials changed. (Pattadon)
- [ ] Share the picked repo between the Repo and Chat screens (Chat uses `repos[0]` from `mock.ts` for now). (Trin)
- [ ] `commitFiles` writes every file as mode `100644`, so committing an executable script drops its +x bit. Fine for the demo.
- [ ] Sign-in screen copy: say that GitHub's `repo` scope gives full access to your repos (needed for private repos). (Trin)

## Open questions
- Review `PLAN/2026-10-16-demo-polish-kin.md` once (chat follows the picked repo, keep file modes on commit, demo cleanup SQL: destructive). (Pattadon)
- Run `supabase/profiles.sql`, `schema.sql`, `chat-author.sql` (login identity, PR #24 is live). (Pattadon)
- Which hackathon and submission format? Deadline: 2026-10-16 11:30 (24 h from 2026-10-15 11:30). (Pattadon)
- What are the non-goals for v1? (Pattadon)
- A GitHub OAuth app may allow only one callback URL. Do we need two apps (localhost dev keys and Vercel prod keys)? Callback path: `/api/github/callback`. (Pattadon, accounts-and-keys)
