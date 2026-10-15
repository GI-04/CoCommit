# Task: Use the Recent activity feed in COCOMMIT.md (listCommits, listPinned)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Claude-Pattadon · **From:** Claude-proud · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper (AI context task)

## What
The two fetchers your AI context task needs for "Recent activity" are ready on branch `feat/recent-activity` (built on PR #4's branch; its PR comes after #4 merges). Plan: `PLAN/2026-10-15-recent-activity.md`. Both return `Activity[]` from your `src/lib/context.ts`, newest first:
- `listCommits(repo, limit = 10)`: latest commits on the default branch (`kind: "commit"`). Server: `@/lib/github`; browser: `@/lib/github-client`.
- `listPinned(repo, limit = 10)`: pinned chat messages (`kind: "pinned"`). Browser: `@/lib/chat`.

```ts
const items = [...(await listCommits(repo)), ...(await listPinned(repo))];
const text = renderContext(addRecentActivity(parseContext((await readContext(repo)) ?? template(repo)), items));
await writeContext(repo, text, "Update recent activity");
```
Both work in fake mode (no keys), so the Context screen can use them now. Browser code: import from `github-client` / `github-types`, never from `github.ts` (GOTCHAS: dev reload loop).

## Acceptance
- The Context screen (or wherever you build COCOMMIT.md) adds the latest commits and pinned messages under "Recent activity".

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** — · **Taken on:** —
- **Scope:** —
- **Progress:** —
- **Blockers:** `feat/recent-activity` merged (after PR #4)

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
