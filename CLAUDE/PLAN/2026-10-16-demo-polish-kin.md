# Plan: Demo polish batch (Kin): chat follows your repo, keep file modes, clean test messages

**Status:** proposed: changes requested by Pattadon, 2026-10-16 (see Review below) <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**Proposed by:** Kin (with Claude-Kin) · **Needs OK from:** Pattadon (**one review for the whole batch**; item 3 is destructive, so the temporary rule in `DECISIONS.md` still requires it)

## Why
Three loose ends before the 11:30 demo, batched so Pattadon reviews once instead of three times:
1. **Chat ignores the repo you picked.** `/chat` always uses `repos[0]` from `mock.ts` (`GI-04/CoCommit`), while `/repo` lets you pick any repo. In the demo, picking a repo and opening Chat shows the wrong channel. (TODO backlog item, listed for Trin; Trin hasn't picked it up, and this is mostly a small shared helper.)
2. **Committing an executable script drops its +x bit.** `commitFiles` writes every file as mode `100644` (`src/lib/github.ts` around line 276; TODO backlog). Editing `scripts/deploy.sh` from the app silently makes it non-executable.
3. **Test messages are still in the team chat:** "Guest 330" (Claude-Pattadon's) and "[test by Claude-proud] …" (HANDOFF says delete before the demo). Chat has no delete button, so this needs SQL.

## Approach
1. **Chat follows the picked repo:**
   - New `src/lib/current-repo.ts`: `getCurrentRepo()` / `setCurrentRepo(fullName)`, saved in `localStorage` (`cocommit-current-repo`), plus a `cocommit:repo-changed` event so open pages update.
   - `/repo` calls `setCurrentRepo` when you pick a repo (one line).
   - `/chat` reads it, falling back to `GI-04/CoCommit` (the demo repo), and shows it in the header as today (`# owner/name`). Switching repos re-subscribes to that channel.
   - No server or database change: chat channels are already per repo (`messages.repo`).
2. **Keep file modes on commit:** in `commitFiles`, for files that already exist on the branch, reuse their mode from the base tree (`100755` stays executable); new files stay `100644`. One extra lookup in the tree request the function already makes. Test with the local fake GitHub (`CLAUDE/LIB/sources/general/mock-github.mjs`).
3. **Demo cleanup SQL** (`supabase/demo-cleanup.sql`, **destructive**):
   - Step 1 **lists** the rows it would delete: exact matches only, `author = 'Guest 330'` with its known text, and `text like '[test by Claude-proud]%'`.
   - Step 2 deletes exactly those rows, in a transaction that aborts if the count isn't what step 1 showed.
   - Run by Pattadon in the SQL editor (only he has dashboard access). Nothing else is touched.

## Files touched
- `src/lib/current-repo.ts` (new), `src/app/repo/page.tsx` (one line), `src/app/chat/page.tsx` (repo source + re-subscribe)
- `src/lib/github.ts` (`commitFiles` modes only)
- `supabase/demo-cleanup.sql` (new)
- `tests/`: `current-repo.test.mjs`, and a `commitFiles` mode test against the fake GitHub
- `CLAUDE/LIB` chat + github-api notes, TODO (remove the two backlog items)

## Risks / needs OK
- **Item 3 deletes data** (two or three chat rows). The SQL shows them first and deletes nothing else; Pattadon runs it, and can skip it.
- Item 1 touches Trin's screens (`/repo`, `/chat`) with small changes. If Trin is already on it, I'll drop item 1.
- Merging auto-deploys. Items 1–2 are small and covered by tests; merge before ~09:00 (`AUTO_DEPLOY=off` for the demo).
- About 1.5–2 h. Login identity's live checks and SQL stay open separately (skipped for now; see its task).

## How we'll verify
- `npm run typecheck`, `npm run build`, `npm test` (new tests for the repo helper and file modes).
- Local browser: pick a repo on `/repo` → `/chat` shows that channel; switching repos updates it.
- Fake GitHub: editing a `100755` file keeps `100755`; a new file is `100644`.
- SQL: step 1 lists exactly the expected test rows (checked by Pattadon before step 2).

## Review (Pattadon with Claude-Pattadon, 2026-10-16): changes requested, please re-evaluate
**Item 1: chat follows the picked repo. OK in principle, with changes:**
- **Scope change from Pattadon:** people should be able to have more than one chat, and some chats should not belong to any repo. For the demo: keep "chat follows the repo" and add one fixed **#general** chat that isn't tied to a repo (stored as `messages.repo = 'general'`, so no database change), with a way to switch between #general and the repo chat. Chats people create themselves (a `channels` table, a create button, a list) go in a **separate plan after the demo**.
- When the chat switches, clear the message list. `loadMessages` and `subscribe` merge into the current list (`src/app/chat/page.tsx` 56–59), so the old chat's messages would stay on screen. Re-subscribe `onlineUsers` too (line 63; it only depends on `name` today).
- Save the picked repo only when it comes from a real repo list, not the fake one shown while signed out. Otherwise chat moves to an empty channel.
- The custom `cocommit:repo-changed` event isn't needed: `/repo` and `/chat` are never open in the same tab at once, so reading the saved repo when the page opens is enough.
- Note in the plan that the Decision and Gotcha pin forms will save to the chat's repo, and that #general has no repo, so hide those forms or turn them off there.
- Tell Trin before you change `/repo` and `/chat`.

**Item 2: keep file modes. Approved, with corrections:**
- `commitFiles` doesn't read the file list today: it only takes the tree's sha (`src/lib/github.ts` 270–279). Getting the existing modes needs a **new** request, `GET git/trees/<baseTree>?recursive=1`. If GitHub returns `truncated: true`, fall back to `100644` for files it didn't list.
- Keep `120000` (symlinks) and `160000` (submodules) as they are, or refuse to commit them. Don't overwrite them as regular files.
- Tests: an existing `100755` file stays `100755`, a new file is `100644`, and a deleted file still works. `commitFilesQuietly` uses the same path, so it's covered.

**Item 3: demo cleanup SQL. Dropped from this batch.**
- Pattadon plans to wipe the whole database later (to stage clean data for the pitch deck), so this script isn't needed. That wipe is destructive and will be its own plan with Pattadon's OK. Open questions for it: the timing (before or after the 11:30 demo; the test messages stay visible until then) and the scope (chat messages only, or also profiles and accounts).

**Next:** update this plan (item 1 rewritten, item 2 corrected, item 3 removed) and set it back to `proposed` for one more quick review.
