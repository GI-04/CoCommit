# Plan: `@cocommit` bot reads the whole repo (code, PRs, issues, any branch), with model choice, your own API key and debug mode

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**By:** Claude-proud (for proud) · builds on `PLAN/2026-10-15-file-bot.md` (done, merged in PR #25) · revised after proud's changes · approved by proud 2026-10-16

## Why
The bot (chat `@cocommit` and the floating Assistant) can only read `COCOMMIT/`. proud wants it to:
1. read the whole codebase and repo, with no limits, except what the user says not to read;
2. accept a custom API key;
3. have a debug mode;
4. read pull requests and issues, and read any branch;
5. search files and say where things are (file and line);
6. summarize the project;
7. and (from the first version of this plan) let people pick the AI model.

## Approach

### 1. Read everything in the repo
- Every file on the chosen branch can be listed, searched and read. No folder or file-type block list.
- Files git doesn't track (like `.env.local`) aren't in the repo, so the bot can't see them anyway.
- **Big files** are read in pages (`from_line` / `to_line`, about 400 lines per call) instead of being refused. **Binary files** (images, installers) come back as "binary, N bytes" plus their path. Claude can't read their contents.
- `COCOMMIT/` is still preloaded and cached as now (small, asked about most).

### 2. "Don't read" list (the only limit)
- **Assistant settings → Don't read:** one path or pattern per line (e.g. `src-tauri/`, `*.lock`, `secret-notes.md`), saved in this browser and sent with every question.
- The server enforces it: those paths are left out of listings and search results, and reading them returns "excluded by your settings".
- If a question says "don't look at X", the prompt tells Claude to respect it too. The server-side list is the reliable one.

### 3. Pick the branch
- A branch menu in the Assistant (default: the repo's default branch), filled from `listBranches`.
- All reads, searches and links use that branch.

### 4. Tools (all read-only)
| Tool | Does |
|---|---|
| `get_project_overview()` | Summary input: README, `package.json` (or other manifests), top-level folders, languages (GitHub languages API), `COCOMMIT/PROJECT.md` + `HANDOFF.md`, open PR and issue counts |
| `list_repo_files(path?)` | Files and folders on the branch (one git tree call, cached 5 min per person + repo + branch) |
| `search_files(query)` | **Name search** over every path, plus **content search**: GitHub code search on the default branch. On other branches, or when code search fails or is rate limited, it greps the files whose names match and the files already read. Returns `path:line` + the matching line |
| `read_file(path, from_line?, to_line?)` | Any file on the branch, with line numbers, paged |
| `get_file_history(path)` | Recent commits touching a file or folder (who, when, message) |
| `list_branches()` | Branch names |
| `list_pull_requests(state?)` | Open/closed/all PRs: number, title, author, branch, updated |
| `read_pull_request(number)` | Description, changed files with +/−, the diff (paged), review comments |
| `list_issues(state?)` | Issues (not PRs): number, title, author, labels |
| `read_issue(number)` | Body and comments |
| Existing COCOMMIT tools | `find_entry`, `get_overview`, `get_changes_since`, `get_member_work`, `get_chat_messages`: unchanged |

### 5. Locations in answers
- Answers name `path:line` and link to `…/blob/<branch>/<path>#L10-L25`. Sources under the answer list those links.
- "Where is X?" questions get a short list of locations, best first.

### 6. Model picker
| Choice | Model | Effort |
|---|---|---|
| Fast (default) | `claude-haiku-5-5` | low |
| Balanced | `claude-sonnet-5-5` | medium |
| Best | `claude-opus-5-5` | medium |
| Custom | any model ID typed in Settings | medium |
- Sonnet and Opus get server-side refusal fallbacks (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). Custom and Haiku get none.

### 7. Your own API key ("custom API")
- **Assistant settings → API key:** paste your own Anthropic key (and a workspace ID if the key needs one). It's sent with each question over HTTPS, used for that one request, and never stored or logged on the server. It's kept in the browser only if you tick "Remember on this device" (otherwise it lasts until the tab closes).
- No key entered → the server's `ANTHROPIC_API_KEY`, as now.
- Optional **API URL** field, for an Anthropic-compatible proxy. Only `https://` URLs are allowed, and the field is off unless a URL is entered.

### 8. Debug mode
- **Assistant settings → Debug:** each answer gets a fold-out showing the model, rounds, every tool call (name, input, short result, time), Claude's token use per round (input / output / cache read / cache write), the total time, and any error text from the API.
- The server adds a `debug` field only when asked. Your API key is never included.

### 9. Loop and limits
- Up to 12 tool rounds (code and PR questions need more lookups); the last round answers without tools. Function time limit 60 s (Vercel max on our plan; checked before building).
- These caps keep a question from running forever. They don't limit what can be read.

## Files touched
- `src/lib/bot.ts` — tool definitions, prompt, `MODELS`, exclude-pattern matching, line paging, link helpers, project-overview text.
- `src/lib/bot-tools.ts` — the new tools, tree cache per branch, grep fallback.
- `src/lib/github.ts` — server-only reads: `searchCode`, `listPulls`, `getPull` (+ files, diff, comments), `listIssues`, `getIssue` (+ comments), `getLanguages`; `readFile` already takes a branch.
- `src/app/api/bot/route.ts` — accepts `model`, `branch`, `exclude`, `apiKey`, `workspaceId`, `apiUrl`, `debug`; builds the debug trace; 12 rounds.
- `src/lib/bot-client.ts` — sends the new fields; settings saved in this browser.
- `src/components/Assistant.tsx` — Settings panel (model, branch, don't-read list, API key, debug) and the debug fold-out. Trin's area: Trin to glance.
- `src/app/chat/page.tsx` — `@cocommit` uses the same saved settings.
- Tests: `tests/bot.test.mjs`, `tests/bot-route.test.mjs` (exclude list, paging, binary files, model list, custom key never echoed in debug, PR/issue tools with a fake GitHub).
- `README.md`, `.env.example` (nothing new required), LIB `file-bot`.

## Risks / needs OK
- **No read limits means anything committed to the repo can be sent to the Claude API**, including secrets someone committed by mistake. The don't-read list is the only guard. Only repos the asker can already read on GitHub.
- **Custom API key in the browser:** if "remember" is ticked, the key sits in that browser's storage. A malicious script on our site could read it. Off by default, with a warning next to the box.
- **Custom API URL:** questions, code and the key would go to that URL. Only `https://`, and a warning in the UI.
- **Cost:** anyone signed in can pick Best on the team key; Best costs ~20–40× Fast. A per-person limit can come later.
- **GitHub rate limits:** code search is ~10 calls a minute per person; PR/issue reads use the asker's normal 5,000 an hour. The grep fallback covers search.
- **Live site:** still answers 503 until `ANTHROPIC_API_KEY` is set in Vercel **Production** for `gi-04/cocommit` (Pattadon). Users with their own key can use it even before that.
- No package installs. Commit/push/PR only when proud asks. Built in a separate worktree from `origin/main`, because the main folder is on another chat's branch.

## How we'll verify
- `npm run typecheck`, `npm test`, `npm run build`.
- Local run with the real Claude key against a fake GitHub that serves this repo's real files plus a sample PR and issue:
  - "summarize this project", "where is the GitHub token cookie encrypted?" (expects `src/lib/github.ts` with line links), "what does PR #1 change?", "what's issue #2 about?";
  - switch branch, and confirm the links and contents follow it;
  - add `src/lib/` to Don't read, and confirm the answer can't use it;
  - each model choice sends that model ID; a custom key is used and never shows up in debug or logs; debug shows the tool calls and tokens.

## Changed while building (2026-10-16)
- **Search and reads use a tarball snapshot, not GitHub code search:** the branch is downloaded once (`/tarball/{branch}`, about 0.5 s for this repo), kept 5 minutes, and searched locally. This works on every branch, gives exact line numbers, and has no code-search rate limit. Recorded in `DECISIONS.md`.
- **The time guard is 40 s:** after that, the next round must answer.
