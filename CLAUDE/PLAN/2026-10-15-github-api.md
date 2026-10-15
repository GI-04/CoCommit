# Plan: GitHub sign-in and git-button API

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **By:** Claude-proud · **Task:** `BOARD/Taken/2026-10-15-github-git-buttons.md` · **Superseded by:** —

## Why
The Repo and Context screens run on fake data (`src/lib/mock.ts`). This makes the git buttons real: sign in with GitHub, list repos and branches, show changes, commit, open a PR, and read/write `COCOMMIT.md`.

## Choices
1. **Plain `fetch` to the GitHub REST API, no `@octokit/rest`.** It needs no package install, so there's no wait for Pattadon's OK. Octokit can still be added later.
2. **Sign-in:** GitHub OAuth web flow (`/api/github/login` → GitHub → `/api/github/callback`). The token is encrypted (AES-256-GCM, key derived from `GITHUB_CLIENT_SECRET`) and kept in an `httpOnly` cookie, so browser code never sees it. A one-time `state` cookie blocks forged callbacks. `POST /api/github/logout` clears it.
3. **The screens are client components**, so they can't call server code. They get:
   - one JSON route, `POST /api/github/[action]`, that calls the server functions;
   - `src/lib/github-client.ts`, with the **same function names** and the same data shapes as `mock.ts` (`Repo`, `Change`, branches as `string[]`). Wiring a screen means changing its import from `@/lib/mock` to `@/lib/github-client`.
4. **Fake mode:** while `GITHUB_CLIENT_ID` is empty, every function returns fake data, so the screens work before the keys exist. It switches to GitHub automatically once the keys are set.
5. **What the functions do** (repo = `"owner/name"`):
   - `getChanges(repo, branch)`: what the branch changed compared with the default branch, i.e. what its PR would contain.
   - `commitFiles(repo, branch, files, message)`: one commit with several files (`content: null` deletes a file). Creates the branch from the default branch if it doesn't exist.
   - `openPullRequest(repo, head, base, title)`: if that PR is already open, returns it instead of failing.
   - `readContext` / `writeContext`: `COCOMMIT.md` on the default branch.
   - Extras: `getUser()`, `readFile(repo, branch, path)`, `listFiles(repo, branch)`.

## Files
New: `src/lib/github.ts` (server only), `src/lib/github-client.ts` (browser), `src/app/api/github/{login,callback,logout,[action]}/route.ts`. I won't touch the screens, `mock.ts` or other people's files.

## Verify
- `npm run typecheck` shows no errors in these files.
- Dev server in fake mode: each action returns fake data.
- A local fake GitHub server (`GITHUB_API_URL` / `GITHUB_WEB_URL` point to it) runs the real code path end to end: login → callback → repos → changes → commit → PR → context. No real token is used.
- The real test (sign in and commit to a test repo on GitHub) waits for the OAuth keys.

## Risks
- **No local copy of the code on web.** The Repo screen lists "changed files" to commit, but through the API there is nothing uncommitted. The screen needs a way to make edits (edit a file in the browser, or upload one) and then call `commitFiles`. That's for the screen owner (Trin).
- **One callback URL per GitHub OAuth app.** localhost and Vercel may need two OAuth apps (dev and prod keys). That's for the accounts-and-keys task (Pattadon).
- The `repo` scope gives full access to the user's repos. That's needed for private repos; say so on the sign-in screen.
