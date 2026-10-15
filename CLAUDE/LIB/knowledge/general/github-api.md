# GitHub sign-in and git API (`src/lib/github.ts`)

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
Server code imports `@/lib/github`; `"use client"` screens import `@/lib/github-client`. Both have the same function names, and the client calls them through `POST /api/github/<name>`. While `GITHUB_CLIENT_ID` is empty, everything returns fake data. To test the real code path without a real token, run the dev server against `sources/general/mock-github.mjs`.

## Details
- **Types:** shared shapes and the `GitHubActions` list live in `src/lib/github-types.ts` (no imports). Browser code imports types from there, never from `github.ts` (server code; importing it, even as a type, made `next dev` reload open tabs forever).
- **Functions** (repo = `"owner/name"`): `getSession` (`{ user, fake }`, user null = not signed in), `listRepos`, `listBranches` (string[]), `getChanges(repo, branch)` (branch vs default branch = what its PR contains; statuses `added | modified | deleted`), `commitFiles(repo, branch, [{ path, content | null }], message)` (one commit; null deletes; creates the branch from default if missing), `openPullRequest(repo, head, base, title, body?)` (returns the already-open PR instead of failing), `readFile(repo, branch | null, path)` (null if missing), `listFiles`, `readContext` / `writeContext` (`COCOMMIT.md` on default branch), `listCommits(repo, limit = 10)` (default branch, newest first, as `Activity` items from `context.ts` for "Recent activity"; fake mode includes fake commits made on `main`).
- **Errors:** server throws `GitHubError` (`.status`); client throws `GitHubRequestError` (`.status`). 401 = not signed in → send the browser to `signInHref()`.
- **Sign-in:** `GET /api/github/login?returnTo=/path` → GitHub → `GET /api/github/callback` → back to `returnTo`. `POST /api/github/logout` forgets the token. Token lives in cookie `cc_github`, AES-256-GCM-encrypted with a key from `GITHUB_CLIENT_SECRET`, `httpOnly`. Scope `repo read:user`.
- **Env:** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`; optional `GITHUB_API_URL`, `GITHUB_WEB_URL` (GitHub Enterprise or the mock).
- **No packages:** plain `fetch`, no Octokit.
- **Mock test:** start `node <path>/mock-github.mjs` (port 4010), then run the dev server with the env pointed at it. zsh: `GITHUB_CLIENT_ID=test-id GITHUB_CLIENT_SECRET=test-secret GITHUB_API_URL=http://127.0.0.1:4010 GITHUB_WEB_URL=http://127.0.0.1:4010 npx next dev -p 3100`. PowerShell 7: set each with `$env:NAME="value"` first, then `npx next dev -p 3100`. Sign in by following `/api/github/login`'s redirect `state` into `/api/github/callback?code=good-code&state=<state>`. The mock serves repo `acme/app` (branches `main`, `feature/x`); `GET /__log` shows every request it got.

## Sources
- `sources/general/mock-github.mjs`: the fake GitHub used to verify the full flow on 2026-10-15
- `src/lib/github.ts`, `src/lib/github-client.ts`, `src/app/api/github/`: the code itself
- GitHub REST docs (git database API, pulls, contents, compare): https://docs.github.com/en/rest

**Last checked against sources:** 2026-10-15
