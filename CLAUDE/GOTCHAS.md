# Gotchas

<!-- Failures worth not repeating. Newest on top. Each entry needs evidence (error text, command, or file) and a workaround. Remove or mark fixed when the cause is gone. -->

## 2026-10-16: Tailwind 4 picks the winner by value, not by class order (square "glass" buttons)
- **What failed:** `Button` had `rounded-md` in its base and `rounded-full` in the glass variant; the buttons rendered square. A `py-1` passed in `className` is ignored for the same reason (the base `py-2.5` wins).
- **Evidence:** compiled CSS orders same-property utilities by value (`py-1, py-1.5, py-2, py-2.5, py-3`), and the later rule wins whatever the order in the `class` string; computed `border-radius` was 8 px on the live "Ask assistant". Unlayered rules in `globals.css` (like `.btn-glass`) beat every Tailwind utility.
- **Workaround:** one radius per element (`buttonClass` in `ui.tsx`; `tests/ui.test.mjs` fails on a second one); use `!py-1` for an override, never put a `border-radius` or a `transition` shorthand in a custom class that sits on a button.

## 2026-10-16 — Deploy job hangs: Vercel blocks teammates' commits (Hobby plan)
- **What failed:** "Deploy to Vercel" runs sat 11–15 min on "Deploy to production" and were cancelled; the live site stayed on an old build.
- **Evidence:** `vercel ls` showed the deploys as **Blocked**; `vercel inspect` reason: "the commit author doesn't have permission to create deployments for this project" (author tiramisucake0127, a squash merge). The CLI waits on a blocked deploy instead of failing.
- **Workaround:** the deploy step removes `.git` first, so the CLI sends no commit author (same as the old `git archive` hand deploys), and has `timeout-minutes: 8`.

## 2026-10-16 — GitHub's blob API ignores Range: every piece of a big download re-read the whole file
- **What failed:** Drive downloads a big file in 3 MB pieces, but `GET /repos/<repo>/git/blobs/<sha>` (JSON or `Accept: application/vnd.github.raw`) always returns the whole file, even with a `Range` header, so a 24.9 MB download fetched ~25 MB nine times (133 s from Thailand).
- **Evidence:** `curl -H "Range: bytes=3145728-6291455" -H "Accept: application/vnd.github.raw" …/git/blobs/<sha>` → HTTP 200, 26,109,863 bytes; the same range on `https://raw.githubusercontent.com/<repo>/<commit>/<path>` with the token → HTTP 206, 3,145,728 bytes.
- **Workaround:** `downloadFile` asks the raw host for the piece (falls back to the whole blob if it doesn't get a 206 of the right length). Other GitHub hosts: set `GITHUB_RAW_URL`.

## 2026-10-16 — Anonymous Supabase sessions could read every chat (fixed 09:33)
- **What failed:** signed out, `/chat` shows all past messages. `src/lib/chat.ts` calls `signInAnonymously()` for every visitor, and `supabase/schema.sql` lets every `authenticated` user read `messages` (`using (true)`); anonymous users count as `authenticated`. The anon key ships in the site's JavaScript, so anyone can read every repo's chat (and #general) straight from Supabase. Anonymous users can also pin/unpin messages and read `profiles`.
- **Evidence:** proud's screen recording 2026-10-16 08:39 (sign out → `/chat` still shows the history); the policies in `supabase/schema.sql` and `supabase/profiles.sql`.
- **Fix (live 2026-10-16 09:33):** `supabase/chat-privacy.sql`: three RESTRICTIVE policies ("real accounts only") that require `coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false` for reading and pinning `messages` and reading `profiles`. Restrictive policies are ANDed with every other policy, so they hold even if an older open policy exists. Code side: PR #42 (members-only chat, no anonymous sign-in). Rule for new tables: never use `to authenticated using (true)` while anonymous sign-ins are on.
- **Verify from outside, not from the SQL editor:** the first two "ran it" reports didn't change anything on the live project (the SQL editor runs as the owner, and it's easy to be in another project); an anonymous REST call still read 15 messages. `node scripts/check-chat-privacy.mjs` signs in anonymously with the anon key and must print 0 for `messages` and `profiles`.
- **Testing signed out locally without signing out:** open the dev server as `http://127.0.0.1:<port>` (login cookies are per host, so `localhost` keeps its session). Next's dev server blocks its scripts for that host, so the page never hydrates, unless you add `allowedDevOrigins: ["127.0.0.1"]` to `next.config.ts` for the test (and revert it).

## 2026-10-16 — A production deploy can hang at Vercel's "Building…" and get cancelled (it kept happening)
- **Happened again 10:00-10:40 (Thai time):** the deploys for `8f059c3`, `b020640` (run `38840352329`, cancelled 03:02 UTC) and `a15e398` (PR #43, run `38842513913`, cancelled 03:17 UTC) all passed `npm ci`, typecheck and tests, then sat in the **Deploy to production** step until the 15-minute limit. Because the workflow queues runs (`concurrency: vercel-production`, no cancel-in-progress), each hang also held up the next merge, so the PR #43 UI was not live for about 50 minutes. PR #44's deploy (`979adbb`, run `38846465677`) built in about 85 seconds and put everything live, so the code was fine; no deploy skips code (each deploys all of `main`).
- **Idea, not done:** a shorter `timeout-minutes` on the deploy step (a good build takes about 1.5 minutes) would free the queue sooner; someone with Vercel access should also look at why builds hang (the "Inspect" link in a stuck run's log).
- **What failed first:** the deploy run for PR #30 (`38802655070`, `aeee87e`) uploaded fine, printed `Building…` and then nothing for 14 minutes; the job's 15-minute limit cancelled it. The site kept the old version. Vercel's status page showed no incident, and the same code built in about 75 s on the next deploy.
- **Evidence:** the run log ends with `Building…` then `##[error]The operation was canceled.`; the next run (`38804819054`, `90c2258`) succeeded and put `/tasks` live. The workflow's `concurrency` (no cancel-in-progress) made that run wait for the stuck one.
- **Workaround:** a cancelled run doesn't mean the code is broken: check the live site, then rerun the deploy (Actions → "Deploy to Vercel" → Run workflow, or `gh run rerun <id>`) or let the next merge deploy it. Someone with Vercel access should check or cancel the stuck deployment from the run log's "Inspect" link.

## 2026-10-16 — In a git worktree, preview_start runs the main checkout's launch.json
- **What failed:** from the worktree `.claude/worktrees/proud-tasks-board`, `preview_start` with a config added to the worktree's `.claude/launch.json` started the main checkout's `web` config instead (log showed `Environments: .env.local`, which only the main checkout has).
- **Evidence:** preview log of the first start; the worktree has no `.env.local`.
- **Workaround:** add a temporary config to the main checkout's `.claude/launch.json` that changes folder first, e.g. `"runtimeExecutable": "bash", "runtimeArgs": ["-c", "cd .claude/worktrees/<name> && exec npx next dev -p 3300"]`, start it, then restore the file (`git checkout -- .claude/launch.json`). The running server keeps going.
- **Also (2026-10-16, Claude-proud, worktree `proud-drive-folders`):** an absolute `cd` in the worktree's own config didn't help (the main `web` config still started and stopped on "Another next dev server is already running", since another chat's server holds port 3000), and in auto mode the edit to the main checkout's `launch.json` was refused as a shared-folder change. Then: ask the owner to allow that edit (proud allowed it; the documented workaround then worked: back up the file, add the config, `preview_start`, copy the backup back), or cover the flow with a Node end-to-end test (`tests/drive.test.mjs` loads the real `github.ts` in fake mode).

## 2026-10-16 — The stateful mock GitHub broke after "keep file modes on commit" (fixed)
- **What failed:** since PR #29, `commitFiles` reads `GET git/trees/<sha>?recursive=1` before committing; the mock in `LIB/sources/general/workspace-e2e/mock-github-files.mjs` had no such route, so every commit against it would fail with 404.
- **Evidence:** `src/lib/github.ts` line ~273 vs. the mock's route list.
- **Workaround:** the mock now answers that route (all files as `100644` blobs) and has `POST /__seed` for test data. Update the mock whenever `github.ts` starts calling a new GitHub endpoint.

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
