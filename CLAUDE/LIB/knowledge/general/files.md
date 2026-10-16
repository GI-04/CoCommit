# Shared files (/files "Drive", COCOMMIT/files/)

**Added:** 2026-10-16 · **Kind:** reference

## Takeaway
`/files` (titled **Drive**) uploads, lists, downloads and deletes team files and folders. They are stored in the current repo's `COCOMMIT/files/` folder on its default branch, committed through the normal git code (so every change also posts a git event to chat). No new service, SQL or package. Folders go up to 4 deep; files up to **50 MB**. Anything over 3 MB travels in 3 MB pieces, because Vercel caps each request **and** response at 4.5 MB (base64 adds a third).

## Details
- **Pure helpers:** `src/lib/files-util.ts`: `FILES_FOLDER`, `PART_BYTES` (3 MB), `MAX_FILE_BYTES` (50 MB), `MAX_PARTS` (17), `MAX_FOLDER_DEPTH` (4), `FOLDER_MARKER` (`.keep`); `cleanName`, `cleanFolderName`, `uniqueName`, `formatSize`, `partCount`; paths: `isSharedPath` (file in any folder ≤ 4 deep, nothing hidden), `isMarkerPath`, `splitShared`, `sharedPath`; views: `allFolders`, `folderView` (one folder's subfolders + files), `pathsInFolder` (what a folder delete removes), `crumbs`. No imports, so tests load it directly.
- **Folders:** git keeps no empty folders, so **New folder** commits an empty `COCOMMIT/files/<folder>/.keep`. Folders are worked out from file paths and these markers. Deleting a folder is one commit removing every file and marker under it.
- **Types:** `SharedFile = { name, folder, path, size }` (`folder` relative to `COCOMMIT/files`, "" at the top); `SharedListing = { files, markers }`. Defined in files-util, re-exported by `github-types.ts`.
- **Actions** (also `POST /api/github/<name>`; that route has `maxDuration = 300`, raised from 60 for 50 MB joins):
  - `listSharedFiles(repo)` → `SharedListing` from the default branch tree.
  - `downloadFile(repo, path, part = 0)` → `{ content (base64 of that piece), size, parts } | null`; 400 for paths outside `COCOMMIT/files/` or a bad piece number. For a big file the server asks GitHub's raw host (`raw.githubusercontent.com/<repo>/<commit>/<path>`, `Range` header, same token) for just that piece; the API's blob endpoint ignores `Range` and always sends the whole file. If the raw host doesn't answer 206 with the exact length (or `GITHUB_API_URL` points elsewhere and `GITHUB_RAW_URL` isn't set), it falls back to reading the whole blob and slicing.
  - `uploadPart(repo, base64)` → `{ sha }`: stores one ≤ 3 MB piece as a git blob that no commit uses yet.
  - `commitFiles` takes `FileEdit.parts` (blob ids, with `content: ""`) for Drive paths only: the server joins the pieces into one blob (≤ 50 MB) and commits that, so the repo holds the real whole file. Unused piece blobs are left for GitHub to clean up.
  - `encoding: "base64"` (one-request binary files, ≤ 3 MB) works as before.
- **Fake mode:** files, markers and pieces live in dev-server memory (`fakeShared`, `fakeParts`).
- **Browser side:** `src/lib/files.ts`: `listShared`, `uploadSharedFile(repo, file, folder, listing, onProgress)`, `createSharedFolder`, `deleteSharedFile`, `deleteSharedFolder`, `saveSharedFile(repo, file, onProgress)`. Same-name uploads become `name (2).ext` (folder names count too); a folder name already used in the same place is refused. Page `src/app/files/page.tsx`: breadcrumb ("All files › a › b"), folder cards/rows, New folder form, "piece 2 of 9" progress.
- **Tests:** `tests/files.test.mjs` (helpers) and `tests/drive.test.mjs` (files.ts against the real github.ts in fake mode, through a stand-in API that fails if any request or response passes 4.5 MB: folders, an 8 MB file byte for byte, limits).
- **Live check:** `node scripts/drive-live-check.mjs <owner/repo> [MB]` runs this checkout's files.ts + github.ts against real GitHub with your `gh` login (no server, no sign-in page): folder, a big file up and down byte for byte, a small file, folder delete, and the time of each request. It makes 4 real commits, so use the throwaway private repo `tiramisucake0127/cocommit-drive-test`. Results 2026-10-16 from proud's Mac (Thailand): 10 MB and 24.9 MB both pass; joining 24.9 MB took ~30 s (route then allowed 60 s, now 300 s; Vercel sits next to GitHub, so it should be faster there); download 24.9 MB took ~43 s in 9 pieces (was 133 s before the raw-host range read).
- **Not done:** move/rename, who uploaded/when, previews, files over 50 MB (GitHub's own cap is 100 MB).

## Sources
- `src/lib/files-util.ts`, `files.ts`, `github.ts` (`listSharedFiles`, `downloadFile`, `uploadPart`, piece join in `commitFiles`), `git-modes.ts`, `src/app/files/page.tsx`, `src/app/api/github/[action]/route.ts`
- `PLAN/2026-10-16-files.md`, `PLAN/2026-10-16-drive-folders.md`

**Last checked against sources:** 2026-10-16 (fake mode: Node end-to-end test and the page in a browser; real GitHub: `scripts/drive-live-check.mjs` on a private test repo with 10 MB and 24.9 MB files; not yet on Vercel; limit raised to 50 MB on 2026-10-16, not yet tried on real GitHub above 24.9 MB)
