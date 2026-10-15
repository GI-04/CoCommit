# Commit activity heat map (`src/components/HeatMap.tsx`)

**Added:** 2026-10-16 · **Kind:** reference

## Takeaway
`/home` shows a GitHub-style grid of default-branch commits per day for the repo picked on `/repo` (13 weeks, Sunday-first columns, darker = more commits), with a "Person" filter. Data comes from one read-only API action, `listCommitDates(repo, since)`; all counting lives in the pure `src/lib/heatmap.ts`.

## Details
- **`src/lib/heatmap.ts`** (no imports): `buildHeatMap(commits, weeks = 13, now, author?)` buckets by the viewer's local day; ignores commits before the window, after today, or with a bad date; `authors` lists everyone in the window busiest first (even while filtered); cells after today are `null`. `levelFor(count, max)` gives 0 (none) or 1-4 scaled to the busiest day. `windowStart(weeks, now)` is the window's first Sunday (used for the GitHub `since`).
- **`listCommitDates(repo, since)`** in `github.ts` / `github-client.ts` / `github-types.ts`: `GET /commits?per_page=100&page=N&since=...`, up to 5 pages (500 commits), returns `{ author, at }[]` (login, else the git author name). Fake mode filters the fake commits. Bad `since` is a 400.
- **Component:** reads the repo with `getCurrentRepo()` in an effect (no hydration mismatch), shows Loading / a "Log in" link on 401 / the grid. Shades use `color-mix` on `--accent`, so light and dark both work. Squares are buttons: tap shows the date and count under the grid (no hover needed on phones).
- **Limits:** default branch only (not other branches or PRs); busy repos over 500 commits in 13 weeks show only the newest 500; shows commit author dates in the viewer's time zone.
- **Tests:** `tests/heatmap.test.mjs` (window, bucketing, filter, edges, levels, empty). Checked in the browser on fake data (3 commits, filter, tap, phone width, no console errors). Not checked against real GitHub history.

## Sources
- `src/lib/heatmap.ts`, `src/components/HeatMap.tsx`, `src/lib/github.ts` (`listCommitDates`)
- `PLAN/2026-10-16-heat-map.md`
- GitHub REST, list commits (`since`, `per_page`, `page`): https://docs.github.com/en/rest/commits/commits#list-commits

**Last checked against sources:** 2026-10-16
