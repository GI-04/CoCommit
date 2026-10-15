# Shared files (/files, COCOMMIT/files/)

**Added:** 2026-10-16 · **Kind:** reference

## Takeaway
`/files` uploads, lists, downloads and deletes team files. They are stored in the current repo's `COCOMMIT/files/` folder on its default branch, committed through the normal git code (so uploads and deletes also post a git event to chat). No new service, SQL or package. Limit 3 MB per file (Vercel's 4.5 MB body limit, base64 adds a third).

## Details
- **Pure helpers:** `src/lib/files-util.ts` (folder, limit, `cleanName`, `uniqueName`, `formatSize`, `isSharedPath`). No imports, so `tests/files.test.mjs` loads it directly.
- **Binary commits:** `FileEdit` has `encoding?: "base64"`. `commitFiles` (github.ts) uploads each such file as a blob (`POST git/blobs`), then `treeEntries(files, modes, blobs)` (git-modes.ts) points the tree at the blob sha. Text edits are unchanged.
- **Actions** (also at `POST /api/github/<name>`): `listSharedFiles(repo)` → `{name, path, size}[]` from the default branch tree; `downloadFile(repo, path)` → `{content (base64), size} | null`, 400 unless the path is directly inside `COCOMMIT/files/`. Fake mode keeps files in dev-server memory (`fakeShared`).
- **Browser side:** `src/lib/files.ts` (`listShared`, `uploadSharedFile`, `deleteSharedFile`, `saveSharedFile`) and `src/app/files/page.tsx` (repo from `getCurrentRepo()`, drag-and-drop, 401 → "Sign in with GitHub"). Same-name uploads become `name (2).ext`.
- **Not done:** who uploaded/when (would need a commit lookup per file), folders, previews, files over 3 MB.

## Sources
- `src/lib/files-util.ts`, `files.ts`, `github.ts` (`listSharedFiles`, `downloadFile`, blob upload in `commitFiles`), `git-modes.ts`, `src/app/files/page.tsx`
- `PLAN/2026-10-16-files.md`

**Last checked against sources:** 2026-10-16 (fake-mode upload, download bytes, delete checked in the browser; not yet against real GitHub)
