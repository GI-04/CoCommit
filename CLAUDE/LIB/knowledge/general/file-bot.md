# @cocommit chat bot (find and summarize COCOMMIT/ files)

**Added:** 2026-10-16 · **Kind:** reference

## Takeaway
Typing `@cocommit <question>` in `/chat` sends it to `POST /api/bot` instead of the chat. Claude (`claude-haiku-5-5`, plain `fetch`, no SDK) reads the repo's `COCOMMIT/` folder with 9 read-only tools and answers with GitHub links. Only the asker sees the reply until **Share to chat**. Needs `ANTHROPIC_API_KEY` (server only); without it the route returns 503 and chat still works.

## Details
- **Files:** `src/lib/bot.ts` (pure: trigger, search/score/snippet, overview, member work, log/chat filters, `shareText`, `SYSTEM_PROMPT`, `TOOLS`), `src/lib/bot-tools.ts` (server: `loadSnapshot`, `workspacePath`, `runTool`), `src/lib/bot-client.ts` (browser `askBot`), `src/app/api/bot/route.ts` (the loop), `src/app/chat/page.tsx` (UI).
- **GitHub access:** the route uses the asker's own sign-in cookie (`getSession`, `listFolderFiles`, `readFile`, `listFileCommits` in `github.ts`; the last two are server-only, not in `actions`). Not signed in → 401. No `COCOMMIT/` folder → 404.
- **Cache:** all text files under `COCOMMIT/` (max 80) are read once and cached 5 minutes per `login:repo` on the server instance.
- **Tools:** `search_files`, `read_file`, `list_folder`, `get_file_history`, `find_entry`, `get_overview`, `get_changes_since`, `get_member_work`, `get_chat_messages` (chat lines are sent from the browser, last 200). Paths are forced inside `COCOMMIT/`; `..` is refused.
- **Loop:** at most 5 rounds; the last round sends `tool_choice: none` so it must answer. The assistant turn goes back unchanged (Haiku 5.5 returns thinking blocks); all tool results go in one user turn. `effort: low`, `max_tokens` 4000, prompt caching on the fixed system prompt + top-level `cache_control`. Today's date goes in the user message, not the system prompt, so the cache keeps matching.
- **Stop reasons:** `refusal` → fixed "can't help" reply; `max_tokens` → answer marked as cut.
- **Not done:** no rate limit per user; the bot can't write files; the repo is still `repos[0]` like the rest of chat.
- **Tests:** `tests/bot.test.mjs` (pure helpers), `tests/bot-route.test.mjs` (route with a scripted fake Claude and fake GitHub, no network).

## Sources
- `PLAN/2026-10-15-file-bot.md` (approved plan)
- Code paths above

**Last checked against sources:** 2026-10-16
