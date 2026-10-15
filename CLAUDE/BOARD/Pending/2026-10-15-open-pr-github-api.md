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
- **Owner:** — · **Taken on:** —
- **Scope:** —
- **Progress:** —
- **Blockers:** none

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
