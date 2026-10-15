# Deploying the web app (auto-deploy)

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
Every push to `main` deploys to https://cocommit.vercel.app through `.github/workflows/deploy-vercel.yml`. Nobody needs to run `vercel deploy` by hand. The desktop app shows the change immediately, because it loads the live site.

## Details
- **Steps:** check the token is present → `npm ci` → typecheck → tests → `vercel@64.2.0 deploy --prod` (the build runs on Vercel; env vars live in Vercel) → `vercel inspect cocommit.vercel.app` must show the new deploy → `/` and `/home` return 200 and `getSession` returns `"fake":false`.
- **Skipped:** pushes that only touch `CLAUDE/`, `COCOMMIT/`, `docs/`, `src-tauri/`, `*.md` or `desktop-*.yml`.
- **Token:** Pattadon's Vercel token (team `gi-04`, 30-day expiry), stored as the secret `VERCEL_TOKEN` in the GitHub environment `Production`. GitHub doesn't show any main-only branch rule on that environment (2026-10-15), so treat the token as readable by any workflow in the repo.
- **Run by hand:** Actions → "Deploy to Vercel" → Run workflow. The **force** checkbox skips Vercel's build cache, which you need after changing env vars.
- **Pause:** repo variable `AUTO_DEPLOY=off` stops push deploys; running by hand still works.
- **Rollback:** `vercel rollback` turns off automatic domain assignment. New deploys then build but don't go live, and the workflow fails at "Check the domain points to this deploy" until someone runs `vercel promote <url>`.
- **Why not Vercel's Git connection:** on the Hobby plan, it blocks deploys from a private organization repo unless the team owner wrote the commit.
- **Open question:** whether Hobby also blocks CLI deploys of commits written by teammates. The first run (`ef48941`, merged by Pattadon) passed; watch the first teammate merge.
- **Fallback:** `vercel deploy --prod` from a clean export of `main` (GOTCHAS: `.claude/worktrees` upload risk).

## Sources
- `.github/workflows/deploy-vercel.yml`
- `CLAUDE/PLAN/2026-10-15-auto-deploy.md`
- First run: GitHub Actions run 38763372141 → `dpl_EAXDsUyazHKEn6oNUd7BqwQM5Lym`
