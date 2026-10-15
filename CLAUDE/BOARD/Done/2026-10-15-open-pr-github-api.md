# Task: Open a pull request for feat/github-api

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** proud · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
Open a PR from `feat/github-api` into `main`, so the GitHub sign-in, git buttons and `readContext`/`writeContext` reach everyone. Claude-Pattadon's AI context task and Trin's screens are waiting on it.
- First merge `main` into your branch. Expect a conflict in `CLAUDE/LOG.md`; keep both sides.
- The branch adds `@supabase/ssr` 0.12.7 and `@supabase/supabase-js` 2.117.3. Keep those versions; Pattadon's machine already has them installed.
- Supabase is now live, with its keys in Vercel Production. Once this merges, `src/proxy.ts` will send everyone to the Google login. Pattadon would like **GitHub sign-in only** for the demo, so please make `proxy.ts` skip the Google redirect. If you'd rather keep Google, tell Pattadon, because Google then needs its own setup.

## Acceptance
- The PR is open against `main`, `npm run typecheck` and `npm run build` pass, and GitHub says it can merge.
- After deploy, the live site (https://cocommit.vercel.app) still opens without a login wall.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** proud (work by Claude-proud) · **Taken on:** 2026-10-15
- **Scope:** PR #4 (https://github.com/GI-04/CoCommit/pull/4) instead of a separate `feat/github-api` PR: `feat/chat-backend` already contains `feat/github-api` and the chat backend, and merges with `main`. `src/proxy.ts` (no Google login wall), `src/lib/chat.ts` (anonymous Supabase sign-in, GitHub name), `src/components/UserChip.tsx` (hide anonymous users).
- **Progress:** PR #4 set to draft; `main` merged in (e841026). Google login wall off unless `REQUIRE_GOOGLE_LOGIN=true` (`proxy.ts`); chat signs in to Supabase anonymously and shows the GitHub name; `UserChip` hides anonymous users. Fixed a dev-server reload loop (browser code imported types from server `github.ts`; shared types now in `src/lib/github-types.ts`). Verified 2026-10-15: `npm run typecheck` and `npm run build` pass; with stand-in Supabase keys `/`, `/repo`, `/chat`, `/context` return 200 (no login wall), and with `REQUIRE_GOOGLE_LOGIN=true` `/chat` → 307 `/login`; two `/chat` tabs in dev: messages, online (2), and a commit + PR through `github-client` show up as git events in both tabs, no reload loop. Not verified: real Supabase (anonymous sign-in needs Pattadon to turn it on and run the SQL) and the live site after deploy.
- **Blockers:** none. Deployed by Pattadon; live site checked with no login wall.

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** 2026-10-15 · **Verified by:** PR #4 merged (520eedf); typecheck + build passed; live site `/`, `/chat`, `/repo` return 200 with no login wall and live chat works (checked 14:51)
- **Result:** `OUTPUT/2026-10-15-1456-pr4-git-api-chat.md`
