# Plan: Recent activity feed for COCOMMIT.md (listCommits, listPinned)

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **By:** Claude-proud · **Task:** none (follow-up to the git API and chat tasks) · **Superseded by:** —

## Why
The AI context task (Claude-Pattadon) adds the latest commits and pinned chat messages under "Recent activity" in `COCOMMIT.md`. `src/lib/context.ts` already formats and merges them (`addRecentActivity(doc, items)`, type `Activity`), but nothing fetches them yet. This adds the two fetchers, in proud's files, so nobody has to edit `github.ts` or `chat.ts` themselves.

## Branch
`feat/recent-activity`, from `feat/chat-backend` (needs `github-types.ts` and `chat.ts`). PR after PR #4 is merged (otherwise its diff would include all of #4).

## Functions
Both return `Activity[]` from `context.ts` (`{ kind, author, text, at }`, `at` in ISO/UTC so `addRecentActivity` sorts them right), newest first.
- **`listCommits(repo, limit = 10)`** in `github.ts` (`kind: "commit"`): the latest commits on the default branch. `author` = GitHub login (or the commit's author name), `text` = first line of the message, `at` = commit date. Fake mode returns a few sample commits. Exposed to browser code through `github-client.ts` and the existing `/api/github/[action]` route.
- **`listPinned(repo, limit = 10)`** in `chat.ts` (`kind: "pinned"`): pinned messages for the repo. Real: from the `messages` table (same anonymous sign-in as the rest of chat). Fake: from this browser's stored messages.

How the context feature would use them (Claude-Pattadon's code, not mine):
```ts
const items = [...(await listCommits(repo)), ...(await listPinned(repo))];
const text = renderContext(addRecentActivity(parseContext(await readContext(repo) ?? template(repo)), items));
await writeContext(repo, text, "Update recent activity");
```

## Files
`src/lib/github.ts`, `src/lib/github-types.ts` (add to `GitHubActions`; it may import the `Activity` type from `context.ts`, which has no imports, so it's safe for browser code), `src/lib/github-client.ts`, `src/lib/chat.ts`. Also the fake GitHub in `LIB/sources/general/mock-github.mjs` gets a `/commits` route for testing. No screen files.

## Verify
- `npm run typecheck` and `npm run build` pass.
- `listCommits`: fake mode through `/api/github/listCommits` (curl); real code path against the fake GitHub (author, first line only, date, limit).
- `listPinned`: in the browser (fake chat mode), pin two messages and check that only those come back, newest first. This uses a temporary test hook in the Chat page, removed afterwards.
- Feeding both into `addRecentActivity` produces the expected `- YYYY-MM-DD HH:MM · author · kind: text` lines.

**Results 2026-10-15:** all four checks above passed. Typecheck and build pass. `listCommits` in fake mode (default, `limit`, a fake commit on `main` shows first, bad limit falls back to 10) and against the fake GitHub (GitHub login, else the commit's author name; first line only; `per_page` passed; bad repo → 400). `listPinned` in the browser returned only the 2 pinned of 3 messages, newest first; `limit` works; other repos are empty. `addRecentActivity` gave `- 2026-10-15 07:39 · Guest 406 · pinned: …` lines sorted by time. The temporary test hook in the Chat page was removed (`page.tsx` unchanged from the last commit).

## Change 2026-10-15 (after PR #4 merged)
The AI context became a `COCOMMIT/` workspace (`PLAN/2026-10-15-context-workspace.md`): activity now goes into `COCOMMIT/LOG.md` with `addActivity(md, items)` (same `Activity` type), and the plan also wants **merged PRs**. Added `listMergedPulls(repo, limit)` (`kind: "pr"`, fake + real, unmerged closed PRs skipped) and `commitFilesQuietly` in `github-client` (no chat git event, for automatic log commits). Checked all three feeds against the new `addActivity`: right order, no duplicates when re-added. The board note was rewritten for the new API. Approved by proud.

## Afterwards
A short board note for Claude-Pattadon (`To: Claude-Pattadon`) that the feed is ready, with the snippet above.

## Risks
- Real GitHub and Supabase aren't tested yet (no OAuth keys; Supabase SQL not run).
- A PR feed (`kind: "pr"`) isn't included; easy to add later if wanted.
