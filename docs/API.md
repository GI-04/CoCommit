# CoCommit data API (for the team)

How screens talk to GitHub, chat and the `COCOMMIT/` team context. Everything here is in `src/lib/` and is called from `"use client"` screens unless noted. Every function also works **without keys** (fake/demo data), so screens can be built before the services are set up.

> **Rule:** browser code imports from `@/lib/github-client` and `@/lib/github-types`, **never `@/lib/github`**. That file is server code, and importing it, even for a type, makes `next dev` reload open tabs forever (see `CLAUDE/GOTCHAS.md`).

## 1. Git: `@/lib/github-client`
Each call goes through `POST /api/github/<name>`. The GitHub token stays in an encrypted, `httpOnly` cookie on the server, and the browser never sees it. Repos are `"owner/name"`.

| Function | Returns | Notes |
|---|---|---|
| `getSession()` | `{ user: { login, name, avatarUrl } \| null, fake }` | `user: null` = not logged in with GitHub; `fake: true` = no GitHub keys (demo data) |
| `listRepos()` | `{ fullName, defaultBranch, private, updatedAt }[]` | the user's repos, most recently updated first (up to 100) |
| `listBranches(repo)` | `string[]` | |
| `listFiles(repo, branch)` | `string[]` | every file path on the branch |
| `readFile(repo, branch \| null, path)` | `string \| null` | `null` branch = default branch; `null` result = no such file |
| `getChanges(repo, branch)` | `{ path, status: "added"\|"modified"\|"deleted", additions, deletions, patch, previousPath? }[]` | what the branch changed vs the default branch (= what its PR would contain) |
| `commitFiles(repo, branch, files, message)` | `{ sha, url, branch }` | `files = [{ path, content }]`; `content: null` deletes. One commit. A branch that doesn't exist is created from the default branch. **Posts a git event to chat** |
| `commitFilesQuietly(...)` | same | same as `commitFiles`, but no chat event (for automatic commits such as log updates) |
| `openPullRequest(repo, head, base, title, body?)` | `{ number, url, title, head, base }` | if that PR is already open, returns it instead of failing. **Posts a git event** |
| `listCommits(repo, limit = 10)` | `Activity[]` | latest commits on the default branch (for `COCOMMIT/LOG.md`) |
| `listMergedPulls(repo, limit = 10)` | `Activity[]` | recently merged PRs |
| `signInHref(returnTo?)` | `string` | link for a "Log in with GitHub" button; comes back to `returnTo` |
| `signOutOfGitHub()` | | |

**Errors:** calls throw `GitHubRequestError` with `.status`. `401` = not logged in with GitHub → show `signInHref()`. `400` = bad input (e.g. a repo name that isn't `owner/name`).

**Server code** (route handlers, server components) can import the same functions from `@/lib/github`.

## 2. Chat: `@/lib/chat`
One live channel per repo (Supabase Realtime). Message shape: `ChatMessage = { id, repo, author, text, kind: "text" | "git_event", pinned, createdAt }`.

| Function | What it does |
|---|---|
| `loadMessages(repo, limit = 100)` | history, oldest first |
| `subscribe(repo, onMessage)` | live new messages and pin changes; returns a stop function. **Your own messages come back here too**: add them with `mergeMessage(list, m)` so nothing shows twice |
| `sendMessage(repo, text)` / `postGitEvent(repo, summary)` | post a message / a git event |
| `pinMessage(id, pinned = true)` | pin or unpin |
| `onlineUsers(repo, onChange)` | names of everyone with this chat open, live; returns a stop function |
| `listPinned(repo, limit = 10)` | pinned messages as `Activity[]` (for `COCOMMIT/LOG.md`) |
| `myName()` | the name chat posts under |
| `chatFake` | `true` without Supabase keys: messages stay in this browser and sync between tabs |

**Who's talking:** chat signs in to Supabase anonymously when nobody is logged in, so the table rules apply. Rules (`supabase/schema.sql`, `supabase/chat-author.sql`): signed-in users read everything; they post only as themselves; only `pinned` can be changed; a user with a profile name always posts under it, and a guest can't use a member's name (it gets " (guest)").

## 3. Pin a message as a decision or gotcha: `@/lib/chat-pins`
| Function | What it does |
|---|---|
| `decisionFields(m)` / `gotchaFields(m)` | form fields prefilled from a message |
| `saveAsDecision(repo, m, fields)` / `saveAsGotcha(repo, m, fields)` | one commit to `COCOMMIT/DECISIONS.md` / `GOTCHAS.md`, then pins the message. Returns the commit, or `null` if the same entry is already there |

Throws `NoWorkspaceError` if the repo has no `COCOMMIT/` yet, and `GitHubRequestError` 401 if not logged in with GitHub (saving is a commit).

## 4. Team context (`COCOMMIT/`): `@/lib/workspace` (Claude-Pattadon)
`loadWorkspace(repo)` (null = not set up), `setUpWorkspace(repo, form)`, `saveHandoff`, `addDecisionTo`, `addGotchaTo`, `saveMember`, `saveTodo`, `recentActivity(repo)` (commits + merged PRs + pinned chat), and `refreshLog(repo)`. Text helpers are pure functions in `@/lib/context` (`addActivity`, `activityLine`, `parseHandoff`, …). Workspace commits start with `COCOMMIT:` so the log can skip them.

## 5. `Activity`, the shared feed type
`{ kind: "commit" | "pr" | "pinned", author, text, at }`, with `at` in ISO/UTC. Feed `listCommits`, `listMergedPulls` and `listPinned` into `addActivity(logMd, items)`, which sorts them by time and skips duplicates.

## Testing without real services
- **No keys:** everything returns demo data. Run `npm run dev` with empty keys.
- **Real GitHub code path, no real token:** run `node CLAUDE/LIB/sources/general/mock-github.mjs` (a fake GitHub on port 4010) and start the dev server with `GITHUB_CLIENT_ID=test-id GITHUB_CLIENT_SECRET=test-secret GITHUB_API_URL=http://127.0.0.1:4010 GITHUB_WEB_URL=http://127.0.0.1:4010`. Details in `CLAUDE/LIB/knowledge/general/github-api.md`.
