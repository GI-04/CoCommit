# Plan: Auto-deploy `main` to Vercel with GitHub Actions

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **By:** Claude-Pattadon · **Task:** asked directly by Pattadon (option C of three); approved by Pattadon 2026-10-15 · **Superseded by:** —

## Why
Production is deployed by hand with `vercel deploy --prod` from Pattadon's machine. That's three deploys in the last 20 minutes, and every merge to `main` waits for Pattadon. Vercel's built-in Git connection doesn't work for us: the Vercel team `gi-04` is on Hobby, and Hobby blocks deploys from a private organization repo (`GI-04/CoCommit`) unless the team owner authored the commit. Options A (make the repo public) and B (Vercel Pro) were set aside. This plan keeps the repo private and the plan free: a GitHub Actions workflow deploys with Pattadon's Vercel token, which is the same thing Pattadon does by hand today.

## What changes for the team
- A push or merge to `main` builds and goes live on https://cocommit.vercel.app in about 2–3 minutes. The desktop app shows the change too, since it loads the live site.
- Commits that only touch notes and desktop files don't deploy: `CLAUDE/`, `COCOMMIT/`, `docs/`, `src-tauri/`, `*.md`, `desktop-*.yml`.
- **Run it by hand:** GitHub → Actions → "Deploy to Vercel" → Run workflow. One checkbox adds `--force` (needed after changing env vars; see GOTCHAS).
- **Pause switch** (for example during the demo): set the repo variable `AUTO_DEPLOY` to `off`. Pushes then stop deploying; running by hand still works.
- A red ✗ on the commit in GitHub means the deploy failed. The site keeps the previous version.

## Approach
1. **New file `.github/workflows/deploy-vercel.yml`**, written in the style of the two desktop workflows:
   - Triggers: `push` to `main` (with the `paths-ignore` list above) and `workflow_dispatch` (input `force`, a checkbox).
   - Skip the push trigger when `vars.AUTO_DEPLOY == 'off'`.
   - `concurrency: vercel-production` with `cancel-in-progress: false`, so deploys go out one at a time and in order.
   - `environment: production`. The token lives in this GitHub environment, which only `main` may use, so a workflow on another branch can't read it.
   - `permissions: contents: read`, `timeout-minutes: 15`.
   - Steps:
     1. Checkout.
     2. Node 24 (matches the Vercel project).
     3. `npm ci`.
     4. **Gate:** `npm run typecheck` and `npm test`. If either fails, nothing is deployed.
     5. Deploy: `npx --yes vercel@64.2.0 deploy --prod --yes --token "$VERCEL_TOKEN"` (plus `--force` when ticked). The version is pinned to the CLI used today. The build runs on Vercel, as it does now, so the env vars stay in Vercel and never reach GitHub.
     6. **Live check:** `/` and `/home` return 200, and `POST /api/github/getSession` returns `"fake":false`. This catches the stale env-var build cache from GOTCHAS.
     7. Write the deployment URL to the run summary.
   - `VERCEL_ORG_ID` (`team_vwz7…`) and `VERCEL_PROJECT_ID` (`prj_eMe0…`) are set in the workflow's `env`. They're IDs, not secrets, and the CLI needs them because the checkout has no `.vercel/` folder.
2. **Pattadon's setup (by hand, before the first run).** The token never passes through an agent:
   1. Vercel → Account Settings → Tokens → Create. Scope: `gi-04`. Expiration: 30 days (or "after the hackathon").
   2. GitHub → `GI-04/CoCommit` → Settings → Environments → New environment `production` → Deployment branches: **Selected branches** → `main`.
   3. In that environment, add the secret `VERCEL_TOKEN` (paste the token), either on the web page or from the terminal. `gh` asks for the value, so it stays out of shell history.

      zsh:
      ```bash
      gh secret set VERCEL_TOKEN --env production --repo GI-04/CoCommit
      ```
      PowerShell 7:
      ```powershell
      gh secret set VERCEL_TOKEN --env production --repo GI-04/CoCommit
      ```
3. **Docs, once it works.** Change "pushes don't auto-deploy" to describe the workflow, the pause switch and the manual run in: `README.md` (Deploying), `CLAUDE/CLAUDE.md` + `CLAUDE/AGENTS.md` (Deploy row), `CLAUDE/PROJECT.md` (Architecture), `HANDOFF.md`. Add a LIB entry `deploy` (how deploys work, rollback, pause). Close the `.claude/worktrees` upload risk in GOTCHAS for CI deploys (a CI checkout has no worktrees). The local CLI path stays documented as a fallback.

## Files touched
- `.github/workflows/deploy-vercel.yml`: new.
- `README.md`, `CLAUDE/CLAUDE.md`, `CLAUDE/AGENTS.md`, `CLAUDE/PROJECT.md`, `CLAUDE/HANDOFF.md`, `CLAUDE/GOTCHAS.md`, `CLAUDE/LOG.md`, `CLAUDE/DECISIONS.md`: deploy notes.
- `CLAUDE/LIB/pointers/general.json`, `CLAUDE/LIB/knowledge/general/deploy.md` (new): LIB entry.
- No app code, no new packages in `package.json`. `vercel` is downloaded by `npx` inside the CI run only. That counts as an install, and approving this plan approves it.

## Branch
`claude/vercel-auto-deploy-53b5dd` (this worktree, now up to date with `main`). PR to `main` when done. The workflow only runs after it's merged to `main`.

**Progress 2026-10-15 (Claude-Pattadon):** Step 1 written: `.github/workflows/deploy-vercel.yml`. It follows the plan, plus two extra checks. (a) A first step fails with a clear message if the token secret is missing. (b) After deploying, `vercel inspect cocommit.vercel.app` must point at the new deploy, which catches the "rollback switched auto-deploy off" case. Checked locally:
- The YAML parses, and every `run` script passes `bash -n`.
- The token check fails when the secret is empty.
- The domain check passes for the current deploy and fails, with the `vercel promote` hint, for an older one.
- The live check passes against production (`"fake":false`).
- `--force` is added only when ticked.
- Typecheck and 16 tests pass on a clean `git archive` export, with no `.env.local` or `next-env.d.ts` (Node 26 locally; CI uses 24).

The deploy step itself hasn't run yet: it needs the token. Next: Pattadon does step 2, then merge, then the first run (see "How we'll verify"). Docs (step 3) come after the first green run.

## Risks / needs OK
- **Hobby may block these deploys too.** Vercel checks commit authors on Hobby. Our deploys come from the owner's token via the CLI, which isn't the Git connection, but community reports are mixed. If the first teammate-authored merge is blocked, the run goes red and the site stays as it was. The fallback is deploying by hand, or option A/B. The first test below uses a commit by Pattadon, so it won't prove this either way.
- **The demo (2026-10-16 11:30).** Every merge goes live, in the desktop app too. Merging this before the demo is fine if we either set `AUTO_DEPLOY=off` from about 09:00 until after the demo, or agree on "no merges to `main` during the demo".
- **Rollback switches auto-deploy off.** After `vercel rollback`, Vercel stops moving the production domain to new deploys until someone runs `vercel promote <url>`. New auto-deploys would build "Ready" but not go live. This goes in the LIB entry and GOTCHAS.
- **Token power.** The token can do anything Pattadon can do in `gi-04`. Limits: team scope, an expiry date, and an environment that only `main` can use. Anyone who can push to `main` can still change the workflow. That's acceptable for a 4-person team; revoke the token after the hackathon if unsure.
- **GitHub Actions minutes.** Private repos get 2,000 free minutes a month. About 3 minutes per deploy leaves plenty of room.
- **Doesn't replace Kin's installers.** The desktop builds (`desktop-*.yml`) are unchanged.

## How we'll verify
- YAML parses, and `paths-ignore`/`if` match the plan (read-through, plus `gh workflow view` after merge).
- Locally: `npm ci && npm run typecheck && npm test` pass, the same commands as the gate.
- After merge, run by hand (Pattadon's commit): the run goes green, `vercel ls cocommit --scope gi-04` shows a new Production deploy made by `thor1006`, the live check passes, and the site still works (`/`, `/home`, `/repo`, `/chat`).
- First teammate-authored merge: watch the run. Green means the Hobby risk is cleared; record the result in GOTCHAS either way.
- Pause switch: set `AUTO_DEPLOY=off`, push a test commit, and check that the run is skipped. Then set it back.
