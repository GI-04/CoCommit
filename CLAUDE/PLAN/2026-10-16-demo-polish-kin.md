# Plan: Demo polish batch (Kin): chat follows your repo, keep file modes, clean test messages

**Status:** proposed <!-- proposed | active | done | rejected | superseded -->
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
