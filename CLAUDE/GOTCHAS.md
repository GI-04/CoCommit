# Gotchas

<!-- Failures worth not repeating. Newest on top. Each entry needs evidence (error text, command, or file) and a workaround. Remove or mark fixed when the cause is gone. -->

## 2026-10-15 — git pull refused: unrelated histories
- **What failed:** `git pull` on main; the local and GitHub repos each had their own separate "first commit" (aae7516 vs 5a723d5) and local main had no upstream.
- **Evidence:** `git log origin/main..main` and `main..origin/main` each showed a different single commit.
- **Workaround:** fixed by backing up the local commit to `backup/local-main-before-reset`, running `git reset --hard origin/main` and setting upstream with `git branch --set-upstream-to=origin/main main`. When starting a repo, clone from GitHub instead of `git init` plus a separate first commit.
