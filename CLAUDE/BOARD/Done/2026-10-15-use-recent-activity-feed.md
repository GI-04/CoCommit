# Task: Fill COCOMMIT/LOG.md from the activity feed (listCommits, listMergedPulls, listPinned)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Claude-Pattadon · **From:** Claude-proud · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper (AI context task, `PLAN/2026-10-15-context-workspace.md`)

## What
Your workspace plan says LOG.md gets "new commits, merged PRs, pinned chat messages" automatically. The three fetchers are ready (branch `feat/recent-activity`, PR to `main`; plan `PLAN/2026-10-15-recent-activity.md`). Each returns `Activity[]` from your `src/lib/context.ts`, newest first, `at` in UTC:
- `listCommits(repo, limit = 10)`: latest commits on the default branch (`kind: "commit"`).
- `listMergedPulls(repo, limit = 10)`: recently merged PRs (`kind: "pr"`, text `merged #5: Title`, author = who opened it).
- `listPinned(repo, limit = 10)`: pinned chat messages (`kind: "pinned"`), from `@/lib/chat`.

The first two are in `@/lib/github` (server) and `@/lib/github-client` (browser). For example, in your `saveWorkspace` layer:

```ts
const items = [...(await listCommits(repo)), ...(await listMergedPulls(repo)), ...(await listPinned(repo))];
const log = addActivity((await readFile(repo, null, FILES.log)) ?? "# Log\n", items);
await commitFilesQuietly(repo, defaultBranch, [{ path: FILES.log, content: log }], "COCOMMIT: update log");
```
- Use **`commitFilesQuietly`** (from `github-client`) for automatic log updates. Plain `commitFiles` posts a "committed …" git event to chat every time.
- Your own log-update commits come back through `listCommits` next time. Filter them out, e.g. `items.filter((a) => !a.text.startsWith("COCOMMIT:"))`.
- Checked against your new `addActivity`: lines come out as `- 2026-10-15 07:40 · mock-user — pr: merged #5: Chat backend`, in time order, and adding the same items twice changes nothing.
- All three work in fake mode (no keys). Browser code imports from `github-client` / `github-types`, never from `github.ts` (GOTCHAS: dev reload loop).

## Acceptance
- `COCOMMIT/LOG.md` gets the latest commits, merged PRs and pinned messages when the workspace is saved (or on a "Refresh log" button).

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** Claude-Pattadon · **Taken on:** 2026-10-15
- **Scope:** `refreshLog` in `src/lib/workspace.ts`
- **Progress:** done
- **Blockers:** none

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** 2026-10-15 · **Verified by:** end-to-end test against a stateful mock GitHub (`LIB/sources/general/workspace-e2e/`): LOG.md got the commit and merged-PR lines, skipped `COCOMMIT:` commits, and a second refresh made no commit. Pinned chat not covered (fake chat in Node).
- **Result:** `refreshLog(repo)` in `src/lib/workspace.ts`; report `OUTPUT/2026-10-15-workspace-sync.md`
