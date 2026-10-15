# Plan: Demo polish batch (Kin): #general + repo chat, keep file modes on commit

**Status:** proposed: revision 1, after Pattadon's review (2026-10-16 00:34) <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**Proposed by:** Kin (with Claude-Kin) · **Needs OK from:** Pattadon (one more quick review)

## What changed in revision 1
- **Item 1 rewritten:** a fixed **#general** chat plus the repo chat, with a switcher; the message list clears on switch; online re-subscribes; the repo is saved only from a real repo list; no custom event; pin forms hidden on #general; Trin told first.
- **Item 2 corrected:** a new `git/trees?recursive=1` request; `truncated` falls back; symlinks and submodules refused; deletions keep the right mode; tests as asked.
- **Item 3 removed:** the database wipe is Pattadon's separate plan.
- Not destructive any more: no data or files deleted.

## Why
Two loose ends before the 11:30 demo:
1. **Chat ignores the repo you picked**, and every chat belongs to a repo. `/chat` always uses `repos[0]` from `mock.ts` (`GI-04/CoCommit`, `src/app/chat/page.tsx` line 38), while `/repo` lets you pick any repo. Pattadon also wants a team chat that isn't about one repo.
2. **Committing drops file modes.** `commitFiles` sends every file as `100644` (`src/lib/github.ts`, the `git/trees` POST around line 270), so an edited script loses its +x bit, and a symlink or submodule would be overwritten as a plain file.

## Approach
1. **#general + repo chat** (no database change; `messages.repo` already scopes chats):
   - **Two chats** in a switcher at the top of `/chat`: **#general** (`messages.repo = 'general'`) and **# owner/name** (the picked repo, falling back to `GI-04/CoCommit`). The header shows which one is open.
   - **Picked repo:** new `src/lib/current-repo.ts` with `getCurrentRepo()` / `setCurrentRepo(fullName)`, kept in `localStorage` (`cocommit-current-repo`). `/repo` calls `setCurrentRepo` when a repo is chosen, **only when the list is real** (`fake` is false on `/repo`), so the signed-out sample list can't move chat to an empty channel. `/chat` reads it when the page opens. No custom event: the two pages are never open in the same tab together.
   - **Switching chats:** clear the message list, then `loadMessages` + `subscribe` for the new chat (the effect now depends on the chat id; today it runs once and merges into the current list, lines 56–59). `onlineUsers` re-subscribes too (line 63, which today depends only on `name`).
   - **Pin forms:** Decision and Gotcha save to the chat's repo (`saveAsDecision(repo, …)`, line 94). On #general there's no repo, so those two buttons are hidden there. Pin/unpin itself still works.
   - **Trin is told before** `/repo` and `/chat` change (Pattadon/Kin message, with this plan's link). Chats people create themselves (a `channels` table, a create button, a list) are a **separate plan after the demo**.
2. **Keep file modes on commit** (`commitFiles` in `src/lib/github.ts`):
   - A **new** request after reading `baseTree`: `GET git/trees/<baseTree>?recursive=1` → a map `path → mode` for blobs, symlinks and submodules.
   - Edited existing files reuse their mode (`100755` stays executable); new files are `100644`; **deletions** send the existing file's mode with `sha: null`.
   - Existing **symlinks (`120000`) and submodules (`160000`)** are refused with a clear message ("… is a symlink/submodule: edit it with git"), never overwritten as plain files.
   - If GitHub returns `truncated: true`, files it didn't list fall back to `100644` (today's behavior, so nothing gets worse).
   - `commitFilesQuietly` uses the same path, so it's covered.

## Files touched
- `src/lib/current-repo.ts` (new); `src/app/repo/page.tsx` (save on real pick); `src/app/chat/page.tsx` (switcher, reload on switch, online re-subscribe, pin forms hidden on #general)
- `src/lib/github.ts` (`commitFiles` only)
- `tests/current-repo.test.mjs`; a `commitFiles` mode test against the fake GitHub (`CLAUDE/LIB/sources/general/mock-github.mjs`)
- `CLAUDE/LIB` chat + github-api notes; TODO (remove the two backlog items)

## Risks / needs OK
- Touches Trin's screens (`/repo`, `/chat`): small, and Trin is told first. If Trin is already changing them, item 1 waits.
- Merging auto-deploys: merge before ~09:00 (`AUTO_DEPLOY=off` for the demo). Both items are covered by tests and a local browser check.
- One extra GitHub request per commit (the recursive tree). Large repos may be truncated; that falls back safely.
- About 1.5–2 h.

## How we'll verify
- `npm run typecheck`, `npm run build`, `npm test`. New tests:
  - repo helper: save, read and fallback;
  - modes: an existing `100755` stays `100755`; a new file is `100644`; deleting an executable works; a symlink or submodule is refused; truncated → `100644`.
- Local browser (fake mode):
  - `/chat` opens on the repo chat; switch to #general → the list clears and only #general messages show; switch back → the repo's messages;
  - the online list follows the open chat; Decision/Gotcha are hidden on #general;
  - pick a repo on `/repo` → `/chat` opens that repo's chat; the signed-out demo list doesn't change it.

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
