# Handoff

**Last updated:** 2026-10-15 22:45 · **By:** Claude-Pattadon (auto-deploy workflow written; earlier notes kept)

## Current state
Demo scope is active (`PLAN/2026-10-15-demo-scope.md`, ends **2026-10-16 11:30**). Agents are named `<Agent>-<Owner>`; tiramisucake0127 is now **proud** (Claude-proud); rename task Done.
- **Live site: https://cocommit.vercel.app** (Vercel team `gi-04`, project `cocommit`). It's deployed with the CLI, so pushes do NOT auto-deploy: run `vercel deploy --prod` (add `--force` after changing env vars; see GOTCHAS) from a clean checkout of `main`.
- **On `main`:** PR #4 (git API, Google sign-in switched off, real chat; Supabase set up with anonymous sign-ins and both SQL files) and PR #5 (activity feed `listCommits` / `listMergedPulls` / `listPinned` for `COCOMMIT/LOG.md`, plus `commitFilesQuietly`). **GitHub OAuth keys are live** (`getSession` → `"fake":false`). The sidebar has a "Log in" button → `/login` (GitHub recommended; Google availability is read from Supabase). Google setup was reported complete in `OUTPUT/2026-10-15-1530-google-login.md`; live settings were not rechecked in this reading pass.
- **AI context = `COCOMMIT/` team workspace** (`PLAN/2026-10-15-context-workspace.md`). The load/save layer and activity refresh already exist in `src/lib/workspace.ts`; the feed task is in `BOARD/Done/`. The Context screen still uses mock data and needs wiring.
- Desktop (Kin): the Tauri app loads the live site; new-window links open in the system browser (PR #9); GitHub sign-in and commit work in the installed Windows app. Local folder mode works in the desktop app (Rust side merged, PR #11). Installers build on GitHub Actions for macOS and Windows (PR #7, #12), and the site's download button hosts both, rebuilt from `main` after PR #11 (PR #15, live since the `af8f164` deploy). Details: LIB `desktop-app`, `local-git`.
- **Chat names (PR #10, merged):** "Change name" in chat lets guests pick a display name. With `supabase/chat-author.sql` run (PR #16), a poster with a profile name always posts under it and a guest using a member's name gets " (guest)".
- Chat test message "Guest 330" (Claude-Pattadon's) is still in `messages`: delete it before the demo.

## Landing page (2026-10-15, Claude-Pattadon): merged and live
`/` is the landing page (no sidebar); the app home is `/home` (LIB `landing-page`). PR #14 merged (`7bcca02`) and deployed to production: `dpl_jXkpb26snya48KinrcfpW1obxHD9` (`https://cocommit-3nxhnank1-gi-04.vercel.app`). This deploy also put PRs #11–#13 live (Windows installer download, desktop local-git support). Live checks: `/`, `/home`, `/repo`, `/chat`, `/login`, the manifest and the Windows installer all return 200; `/home` has the sidebar; `getSession` → `"fake":false`; no console errors on `/`. Rollback target: `https://cocommit-p0yrxcans-gi-04.vercel.app` (`dpl_3HHFkzN1jVRQrTSABXhFVYuozeCy`). Deployed from a `git archive` export of `main` because `.claude/worktrees/` (418 MB) sits in the repo folder and there's no `.vercelignore`. **Next:** open the installed desktop app once to confirm it lands on `/home`. Any new "go home" link should use `/home`.

## Auto-deploy (2026-10-15, Claude-Pattadon): workflow written, not merged or run
`PLAN/2026-10-15-auto-deploy.md` (active): `.github/workflows/deploy-vercel.yml` deploys every push to `main` to Vercel production with Pattadon's token. Vercel's own Git connection is blocked on the Hobby plan for a private org repo. On branch `claude/vercel-auto-deploy-53b5dd`, not committed yet. The check steps were dry-run locally and the gate passes; the deploy step itself is untested until the token exists. **Next:**
1. Pattadon creates the Vercel token and the GitHub environment `production` with secret `VERCEL_TOKEN` (plan, step 2).
2. Commit, open a PR and merge it. The merge itself triggers the first deploy.
3. Watch that first run, then update the docs (plan, step 3).
For the demo, set `AUTO_DEPLOY=off` from about 09:00, or don't merge to `main` during it. Until this is merged, deploys stay manual.

## Latest deploy (2026-10-15 21:56, Claude-Pattadon)
`main` at `af8f164` (PRs #10, #15, #16 on top of the landing page) is live: `dpl_BRCuARDXcBX77uzmbEoS3QfkAcww` (`https://cocommit-gqdlwx4yn-gi-04.vercel.app`), deployed from a `git archive` export. Same tree as the merge that passed typecheck and 16 tests. Live checks: `/`, `/home`, `/repo`, `/chat`, `/login`, `/profile`, `/context` and the manifest return 200; both installers return 200 with the rebuilt sizes (dmg 7540675, exe 2482905 bytes); `getSession` → `"fake":false`; no console errors on `/`. Rollback target: `https://cocommit-3nxhnank1-gi-04.vercel.app` (`dpl_jXkpb26snya48KinrcfpW1obxHD9`).

## Chat pins handoff (2026-10-15, Codex-proud)
Merged into main and live (`af8f164` deploy): `src/lib/chat-pins.ts` and Decision/Gotcha forms in `/chat`. Approved plan: `PLAN/2026-10-15-chat-pins.md`. Previous browser checks cover both forms, cancel, signed-out and missing-workspace cases; typecheck and production build passed again this session. Real GitHub saving has not been tested. Next: production deploy by the teammate with Vercel access, then verify real GitHub saving; coordinate page changes through Trin's review task.

## Exact next step
0. Profile is live at `https://cocommit.vercel.app/profile`: source commit `d245b86` (profile commit `c0c7b94`, merged with desktop and chat-actions updates; no rebase/force push). Vercel deployment `dpl_5Zp6oE1uLzTTtErQykPJkPgNuvVK`, `https://cocommit-4frfib617-gi-04.vercel.app`. Production Turbopack build passed; live signed-out page loads with no console errors; GitHub session API returns `fake:false`. Next: verify profile edits with a real signed-in test account. Rollback target before this release: `https://cocommit-l66vm0d6k-gi-04.vercel.app`. See `OUTPUT/2026-10-15-account-profile.md`.
1. proud: declined the login-backend task. PR #16 (merged and live since the `af8f164` deploy): this repo's `COCOMMIT/` workspace, git-event links, `supabase/chat-author.sql`, demo script `OUTPUT/2026-10-15-2145-demo-script.md`, `docs/API.md`. Next: someone with Supabase access runs `chat-author.sql`; rehearse with the demo script. Still open: a real Commit test on the Repo screen (closes `github-git-buttons` and `chat-backend`).
2. Context frontend owner (Trin): wire the tabbed Context screen and setup flow to the existing `src/lib/workspace.ts` helpers; no new load/save layer is needed.
3. Trin: login frontend, `wire-screens-to-github`, `review-chat-screen`, the tabbed Context screen.
4. Pattadon: dev OAuth app for localhost (login-backend part 8); decide on Google (part 9).
5. Email/password login (`PLAN/2026-10-15-email-password-login.md`, active): Kin's backend is merged (PR #6: `src/lib/auth-email.ts`, `src/lib/permissions.ts`). Pattadon: in Supabase turn on the Email provider, turn Confirm email off for the demo, add `https://cocommit.vercel.app/auth/*` and `http://localhost:3000/auth/*` to Redirect URLs, and re-run `supabase/profiles.sql`. Trin: the form (`BOARD/Pending/2026-10-15-email-login-frontend.md`); `signUpWithEmail` also returns `needsConfirmation`.

## Repository reading (2026-10-15)
- Source inspected at `24137f0`: GitHub Repo UI and chat implemented; chat still selects the fixed mock repo; Context UI remains mock; email/reset UI absent.
- Local git TypeScript UI/bridge exists on `main`; the Rust commands, dialog plugin and remote IPC capability are merged too (Kin, PR #11), so Local mode works in the desktop app.
- Typecheck passed; local env checker reports all four required values present. No live service, browser, desktop or end-to-end tests were rerun.
- Reading report: `OUTPUT/2026-10-15-project-reading.md`. No implementation tasks claimed.

## Watch out
- Ask before commit, push, package installs or deleting files.
- Browser code must not import `src/lib/github.ts`, even for types (dev reload loop; GOTCHAS). Use `src/lib/github-types.ts`.
- Several chats share this folder on proud's machine: stage only your own files, and don't switch branches without checking the others (GOTCHAS).
- Give shell commands in both zsh and PowerShell 7.
- Tauri needs Rust; placeholder icons are generated (see `src-tauri/BUILDING.md`).
- No static export: the desktop app loads the web URL.
