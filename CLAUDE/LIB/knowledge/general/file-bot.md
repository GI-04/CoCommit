# @cocommit bot and Assistant (reads the whole repo, Edit mode opens PRs)

**Added:** 2026-10-16 · **Kind:** reference

## Takeaway
`@cocommit <question>` in `/chat` and the floating **Assistant** both call `POST /api/bot`. Claude reads the whole repo on the chosen branch (code, `COCOMMIT/` team notes, history, pull requests, issues) with 15 read-only tools and answers with `path:line` links. Settings in the Assistant (sliders button), kept in the browser: model (Fast = `claude-haiku-5-5`, Balanced = `claude-sonnet-5-5`, Best = `claude-opus-5-5`, or a custom ID), branch, a "don't read" list, your own API key (+ optional workspace ID and https API URL), and debug mode. Server key: `ANTHROPIC_API_KEY` (+ `ANTHROPIC_WORKSPACE_ID` only for `sk-ant-usr-…` keys); with neither a server key nor the user's own key the route returns 503.

## Details
- **Files:** `src/lib/bot.ts` (pure: tools, prompt, `MODELS`/`pickModel`, `isExcluded`, `numberLines`, `grepRepo`, `readApiUrl`, `toGithubLink`, COCOMMIT helpers), `src/lib/repo-snapshot.ts` (server: unpacks GitHub's `.tar.gz` with `node:zlib`, no package), `src/lib/bot-tools.ts` (server: `loadSnapshot`, `runTool`), `src/lib/bot-client.ts` (browser: `askBot`, `loadBotSettings`/`saveBotSettings`), `src/app/api/bot/route.ts` (loop), `src/components/Assistant.tsx` (settings panel, debug fold-out), `src/app/chat/page.tsx`.
- **Reading the repo:** one `GET /repos/{repo}/tarball/{branch}` per person + repo + branch, cached 5 minutes (max 20 copies per server instance). On this repo: 343 files, 13 MB download (mostly installers), 1.3 MB of text, about 0.4–0.5 s locally, 32 ms to unpack. Text files up to 1 MB are kept; binaries and bigger files keep only their size. Search (`grepRepo`) and reads run on that copy, so they work on any branch with exact line numbers and no code-search rate limit. GitHub code search is not used (it only covers the default branch and allows ~10 calls a minute).
- **GitHub reads (server only, not in `actions`):** `resolveBranch`, `downloadTarball`, `listFileCommits` (now takes a branch; empty path = whole branch), `listPulls`, `getPull` (files + patches + both kinds of comments), `listIssues` (drops PRs), `getIssue`, `getLanguages`. All use the asker's own GitHub cookie.
- **Don't read:** patterns (`folder/`, `*.lock`, `name.md`, `src/**/*.ts`) are sent with each question and enforced server-side in every tool (listings, search, reads, PR diffs). It's the only limit on what can be read.
- **Loop:** up to 12 rounds; after 40 s the next round must answer (`tool_choice: none`), because Vercel stops at 60 s. `max_tokens` 8000. Effort `low` for Fast, `medium` for Balanced/Best, none for custom IDs. Balanced/Best send `fallbacks: "default"` + beta `server-side-fallback-2026-07-01`, only on Anthropic's own URL.
- **Own key:** used for that request only; never stored, logged or included in `debug`. `apiUrl` must be https and not localhost/`.local`/`.internal`/an IP literal; a bare host gets `/v1/messages` added. A custom URL needs the user's own key. The server's workspace ID only goes with the server key.
- **Debug:** `debug: true` adds `{ model, branch, snapshot, rounds[{ ms, stop, usage{input,output,cacheRead,cacheWrite}, tools[{ name, input, ms, result (400 chars), error }] }], totalMs, error }`, also on error replies.
- **Errors:** Claude API errors come back as `Claude API error (<status>): <message>` (401/403 → HTTP 400, others 502).
- **Tests:** `tests/bot.test.mjs` (helpers), `tests/bot-route.test.mjs` (builds a real `.tar.gz` in memory, scripted fake Claude + fake GitHub; covers models, fallbacks, own key/URL, don't-read, branch, PR/issue, debug, cache, 12-round limit).
- **Gotchas:** in tests, objects made inside `vm` contexts fail `instanceof` against the outer realm, so `readApiUrl` returns `{ url } | { error }` rather than an `Error`. Next.js route files may only export route fields (`POST`, `maxDuration` …), so helpers live in `bot.ts`.

## Edit mode (2026-10-16)
- **Ask / Edit** switch above the Assistant input (`BotSettings.mode`, saved in the browser). Chat `@cocommit` always sends `mode: "ask"`.
- Edit mode adds `edit_file` (exact, unique `old_text`; `applyEdit`), `write_file`, `delete_file`, `show_changes` (`EDIT_TOOLS`, `EDIT_PROMPT` in `bot.ts`). Changes are **staged in the request only** (`ToolContext.changes`, path → text or null); reads, search and listings see them. The answer returns `changes: ChangeView[]` with a line diff (`lineDiff`, plain LCS, 3 lines of context). The browser sends them back with the next question, so a follow-up builds on them.
- Limits: 30 files, 200 KB per file, text only, not on don't-read paths or folders; 20 rounds, final answer forced after 240 s (`maxDuration` 300 on `/api/bot`).
- **Create pull request** → `POST /api/bot/apply`: re-checks every path/size/exclusion, then `commitFiles` makes ONE commit on a NEW branch `assistant/<title-slug>-<4 random>` from the read branch, and `openPullRequest` opens a PR into it, using the asker's GitHub login. If the PR call fails after the commit, the error names the branch. It never commits to an existing branch.
- Not done: running code or tests (no sandbox; Managed Agents would be the route), edits from chat, binary files.
- Checked 2026-10-16: on real GitHub, staging and a follow-up edit to `COCOMMIT/TODO.md` (Sonnet), with nothing written. On a fake GitHub, the full UI: diff card → Create pull request → branch + one commit + PR link.

## Sources
- `PLAN/2026-10-15-file-bot.md` (first version), `PLAN/2026-10-16-bot-code-and-models.md` (this version)
- Code paths above; Anthropic docs via the `claude-api` skill (Messages API, prompt caching, refusal fallbacks)

**Last checked against sources:** 2026-10-16
