# Gotchas

<!-- Failures worth not repeating. Newest on top. Each entry needs evidence (error text, command, or file) and a workaround. Remove or mark fixed when the cause is gone. -->

## 2026-10-16 — LiveKit's CSS beats Tailwind classes; a blocked mic comes through `onError`
- **What failed:** (1) `className="h-[70vh]"` on `LiveKitRoom` did nothing: the call area collapsed to 87px and the second person moved to page 2. (2) A refused microphone kicked the user out of the call.
- **Evidence:** `@livekit/components-styles` sets `.lk-room-container { height: 100% }` unlayered, and Tailwind 4 utilities sit in `@layer utilities`, so LiveKit wins. `LiveKitRoom` calls `onError` with `NotAllowedError: Permission denied` when it can't turn on the mic, the same callback it uses for connection errors.
- **Workaround:** size a wrapper `div` around `LiveKitRoom`, not the room itself. In `onError`, only `e.name === "ConnectionError"` is fatal; show a note for anything else (`src/components/CallRoom.tsx`).

## 2026-10-15 — After `vercel rollback`, auto-deploys build but don't go live
- **What failed:** nothing yet. A rollback turns off Vercel's automatic production-domain assignment, so later deploys from `deploy-vercel.yml` finish "Ready" but `cocommit.vercel.app` stays on the old one.
- **Evidence:** Vercel instant-rollback behaviour. The workflow's "Check the domain points to this deploy" step fails in this case (dry-run tested with an older deploy URL).
- **Workaround:** `vercel promote <deployment-url>` turns assignment back on. The failed run's error message prints the exact command.

## 2026-10-15 — next dev kept reloading /repo (fixed)
- **What failed:** with only /repo open under `next dev`, the page reloaded itself about 15 times a second (console: `[HMR] connected` → reload). Production (`next start`, Vercel) was fine.
- **Evidence:** dev log ~137 `GET /repo` in 8 s, also on plain `main`. Stubbing `LocalRepo`/`local-git` stopped it; then stubbing only the two `await import("@tauri-apps/…")` lines in `src/lib/local-git.ts` stopped it too (0 reloads).
- **Workaround:** `local-git.ts` now imports `invoke` and `open` statically; they only touch Tauri when called. Don't use `await import()` for packages in browser code. Also run `npm ci` after pulling when `package.json` changed: `@tauri-apps/plugin-dialog` was in the lockfile but missing from `node_modules` here.

## 2026-10-15 — Commit to a new branch overwrote newer files with an old copy (fixed in branch fix/new-branch-base)
- **What failed:** on the live Repo screen, proud opened README.md (the screen had picked the old branch `kin/desktop-builds`), typed the new branch `test-cocommit` and committed. `commitFiles` creates a missing branch from the **default branch**, so the old README replaced main's newer one on the new branch (4d04d5d: +17 −105). Not merged.
- **Evidence:** `gh api repos/GI-04/CoCommit/commits/4d04d5d`; `kin/desktop-builds:README.md` matches the new content.
- **Workaround:** until fixed, pick `main` (or the branch you want to build on) in the branch box before opening a file. Fix: `commitFiles(..., from)` creates the new branch from the branch the file was read from, and the Repo screen starts on the default branch. **Fixed:** `commitFiles(..., from)` + Repo screen passes the open branch and starts on the default branch (PLAN/2026-10-15-new-branch-base.md).

## 2026-10-15 — Deploying from the repo folder would upload `.claude/worktrees/`
- **What failed:** nothing yet, but the risk is real. `.claude/worktrees/` (other sessions' git worktrees, 418 MB, possibly with their own `.env.local`) is git-ignored, but there's no `.vercelignore`, so a plain `vercel deploy --prod` from the repo folder may upload it.
- **Evidence:** `du -sh .claude/worktrees` → 418M; `ls -a` shows no `.vercelignore`.
- **Workaround:** deploy from a clean export: `git archive HEAD | tar -x -C <dir>`, copy `.vercel/project.json` into `<dir>/.vercel/`, run `vercel deploy --prod --yes` there. Env vars come from Vercel, not `.env.local`. Longer-term fix: add a `.vercelignore` (ask first). Since 2026-10-15, deploys normally run in GitHub Actions from a clean checkout, so this only matters for a deploy by hand.

## 2026-10-15 — Turbopack build blocked by local port restriction
- **What failed:** `npm run build` failed while evaluating globals.css, including after retrying outside the sandbox.
- **Evidence:** creating new process → binding to a port → Operation not permitted (os error 1).
- **Workaround:** `npm run build -- --webpack` passed, including TypeScript and all page generation. This is an environment workaround; default build configuration was not changed.

## 2026-10-15 — New Vercel env vars ignored until a fresh build
- **What failed:** after adding `GITHUB_CLIENT_ID`/`SECRET` to Vercel Production, `vercel deploy --prod` still served fake mode (`getSession` → `"fake":true`).
- **Evidence:** the values were correct in Vercel (`Ov23…`, 20 chars), but the deploy reused the build cache.
- **Workaround:** after changing env vars, deploy with `vercel deploy --prod --force` (skips the build cache). Then `getSession` returned `"fake":false`.

## 2026-10-15 — Dev server reloaded two open /chat tabs forever (fixed)
- **What failed:** with `/chat` open in two tabs under `next dev`, each tab's page load made the dev server recompile and the other tab do a full reload, about 20 reloads a second (console: `[HMR] connected` → `[Fast Refresh] rebuilding`, then reload). One tab or `/tasks` was fine; production (`next build`) isn't affected.
- **Evidence:** dev log had ~1,600 `GET /chat` and ~650 `✓ Compiled in 1ms` in 90 s. The cause was `import type { Session } from "./github"` in browser code (`chat.ts`): `github.ts` is server code (`node:crypto`, `next/headers`). Removing it stopped the loop (0 reloads in 6 s with two tabs).
- **Workaround:** browser code never imports `github.ts`, not even for types. Shared types live in `src/lib/github-types.ts` (no imports). Keep the same rule for any server-only module.

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
