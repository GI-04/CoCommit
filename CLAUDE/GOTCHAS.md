# Gotchas

<!-- Failures worth not repeating. Newest on top. Each entry needs evidence (error text, command, or file) and a workaround. Remove or mark fixed when the cause is gone. -->

## 2026-10-15 — Two agent chats in one folder share one branch
- **What failed:** Claude-proud and Claude-Pattadon worked in the same checkout on Proud's machine. Claude-Pattadon's Google sign-in was committed onto `feat/github-api` (5d05bf3) and pushed, so one PR would mix two features. Switching branches in one chat changes the files under the other.
- **Evidence:** `git log origin/main..feat/github-api` shows 5d05bf3 "Add Google sign-in…"; `HANDOFF.md` says it was built on `feat/github-api`.
- **Workaround:** one feature per branch; before switching or committing, check `git status` and `git log`, and only stage your own files (`git add <paths>`). Better: give each chat its own git worktree (a second folder on its own branch).

## 2026-10-15 — "owner/name" check let `..` through (fixed)
- **What failed:** validating repo names with `/^[\w.-]+\/[\w.-]+$/` accepted `../evil`; `fetch` normalized `/repos/../evil/branches` to `/evil/branches`.
- **Evidence:** mock GitHub log showed `GET /evil/branches` from `listBranches("../evil")`.
- **Workaround:** `repoPath()` and `seg()` in `src/lib/github.ts` now reject `.`, `..` and empty path parts. Do the same for any user-supplied value put into a URL path.

## 2026-10-15 — Vercel CLI: uppercase folder name rejected; it edits .gitignore
- **What failed:** `vercel deploy --prod --yes` in `CoCommit/`: "Project names ... must be lowercase" (400).
- **Evidence:** the CLI uses the folder name as the project name.
- **Workaround:** `vercel link --yes --project cocommit` first. The link step also writes `.env.local` (with a `VERCEL_OIDC_TOKEN`) and adds `.vercel` and `.env*` to `.gitignore`. We kept `.vercel` and removed `.env*`, because it would also hide `.env.example`.

## 2026-10-15 — Tauri static export vs. API routes (FIXED: no static export; the desktop app loads a URL via `build.frontendDist`, see `src-tauri/BUILDING.md`)
- **What failed:** not yet run. `next.config.ts` switches to `output: "export"` when Tauri builds (`TAURI_ENV_PLATFORM` set); Next.js static export can't build POST route handlers like `src/app/api/livekit-token/route.ts`.
- **Evidence:** Next.js static export docs (route handlers must be static GET).
- **Workaround:** have the desktop app call the deployed web API (or Supabase Edge Functions) for secrets, and exclude `src/app/api/` from the desktop build.

## 2026-10-15 — git pull refused: unrelated histories
- **What failed:** `git pull` on main; the local and GitHub repos each had their own separate "first commit" (aae7516 vs 5a723d5) and local main had no upstream.
- **Evidence:** `git log origin/main..main` and `main..origin/main` each showed a different single commit.
- **Workaround:** fixed by backing up the local commit to `backup/local-main-before-reset`, running `git reset --hard origin/main` and setting upstream with `git branch --set-upstream-to=origin/main main`. When starting a repo, clone from GitHub instead of `git init` plus a separate first commit.
