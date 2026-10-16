# Plan: Drive folders and bigger files

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —

## Why
proud asked for two things on Drive (`/files`, LIB `files`): make folders, and allow files bigger than 3 MB. Today every file sits flat in `COCOMMIT/files/`, and the 3 MB cap comes from Vercel's 4.5 MB limit on one request (base64 adds a third). The same limit applies to the response, so downloads over ~3 MB would also fail.

## Approach
Files stay in the repo's `COCOMMIT/files/` (decision of `PLAN/2026-10-16-files.md`). No new service, package or SQL.

**Folders**
1. A folder is a path under `COCOMMIT/files/` (up to 4 levels). Git keeps no empty folders, so **New folder** commits an empty hidden file `COCOMMIT/files/<folder>/.keep`.
2. `listSharedFiles(repo)` returns `{ files, folders, markers }`: files at any depth (`name`, `folder`, `path`, `size`), every folder path, and the `.keep` paths (so a folder delete can remove them).
3. `/files`: breadcrumb (Drive › designs › logos), folder cards/rows you tap to open, **New folder** next to Upload, Upload and drag-and-drop go into the open folder, **Delete** on a folder removes everything inside in one commit (after a confirm).
4. `files-util.ts` (pure, tested): folder-aware `isSharedPath`, `cleanFolderName`, and `folderView(listing, folder)` (what to show in one folder).

**Bigger files: 3 MB → 25 MB per file**
5. Upload in pieces: the browser cuts a big file into 3 MB pieces; new action `uploadPart(repo, base64)` stores each piece as a git blob (not in any commit). `FileEdit` gets `parts?: string[]`; `commitFiles` joins the pieces into one blob server-side and commits that. So the repo gets the real, whole file; GitHub cleans up the unused piece blobs itself.
6. Download in pieces: `downloadFile(repo, path, part = 0)` returns one 3 MB piece plus `parts`; the browser fetches all pieces and joins them. Small files are one piece, as today.
7. `export const maxDuration = 60` on the GitHub API route (the join can take a few seconds; the bot route already uses 60).
8. Fake mode handles pieces and folders in dev-server memory.

## Files touched
- `src/lib/files-util.ts`, `src/lib/files.ts`, `src/app/files/page.tsx`
- `src/lib/github.ts` (`listSharedFiles`, `downloadFile`, `uploadPart`, piece join in `commitFiles`, fake mode), `github-types.ts`, `github-client.ts`, `src/app/api/github/[action]/route.ts` (maxDuration)
- `tests/files.test.mjs`
- `CLAUDE/LIB` (`files`), `README.md` line

## Risks / needs OK
- Touches `src/lib/github.ts` (proud's area) and the Drive page (Trin's UI area, after Trin's Figma polish): small, additive.
- Bigger files grow the repo (git keeps every version). 25 MB keeps clones reasonable; GitHub's own hard cap is 100 MB per file.
- `uploadPart` lets a signed-in user create unreferenced blobs in repos they can already write to; nothing new beyond what commit access allows.
- Code freeze 09:30 and demo until 11:30: work on branch `proud/drive-folders`; no merge to `main` (merging deploys) without proud's OK.
- `node_modules` in this folder is missing the LiveKit packages: `npm ci` (exact lockfile versions, nothing new) is needed before typecheck/build.

## How we'll verify
- `npm run typecheck`, `npm test` (new tests for folder paths, folder view, piece maths), `npm run build`.
- Browser, fake mode: new folder, open it, upload into it, a file over 3 MB (e.g. 8 MB) uploads and downloads with the exact bytes, delete a folder, phone width, no console errors.
- Not possible here: real GitHub (needs sign-in on the live site after merge).

**Approved 2026-10-16 by proud:** 25 MB per file; `npm ci` OK; branch `proud/drive-folders` (worktree `.claude/worktrees/proud-drive-folders`, since another chat has uncommitted work in the main folder).
