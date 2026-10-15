# Gotchas

<!-- Failures worth not repeating. Newest on top. Each entry needs evidence (error text, command, or file) and a workaround. Remove or mark fixed when the cause is gone. -->

## 2026-10-15 — Tauri static export vs. API routes (expected, not hit yet)
- **What failed:** not yet run. `next.config.ts` switches to `output: "export"` when Tauri builds (`TAURI_ENV_PLATFORM` set); Next.js static export can't build POST route handlers like `src/app/api/livekit-token/route.ts`.
- **Evidence:** Next.js static export docs (route handlers must be static GET).
- **Workaround:** have the desktop app call the deployed web API (or Supabase Edge Functions) for secrets, and exclude `src/app/api/` from the desktop build.

## 2026-10-15 — git pull refused: unrelated histories
- **What failed:** `git pull` on main; the local and GitHub repos each had their own separate "first commit" (aae7516 vs 5a723d5) and local main had no upstream.
- **Evidence:** `git log origin/main..main` and `main..origin/main` each showed a different single commit.
- **Workaround:** fixed by backing up the local commit to `backup/local-main-before-reset`, running `git reset --hard origin/main` and setting upstream with `git branch --set-upstream-to=origin/main main`. When starting a repo, clone from GitHub instead of `git init` plus a separate first commit.
