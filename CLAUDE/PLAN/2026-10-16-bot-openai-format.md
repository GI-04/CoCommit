# Plan: @cocommit bot can use OpenAI-style APIs (Gemini, OpenRouter, Groq…)

**Status:** active (approved in chat 2026-10-16)
**Date:** 2026-10-16 · **Superseded by:** —

## Why
The Assistant's own-key settings only speak Anthropic's Messages API (`/v1/messages`, `x-api-key`, Claude tool blocks). Most other providers, Gemini included, offer an OpenAI-compatible "Chat Completions" API instead (e.g. Gemini: `https://generativelanguage.googleapis.com/v1beta/openai`). Teammates want to use their own (often free-tier) Gemini key.

## Approach
1. **New setting "API format"**: `Anthropic` (default, today's behaviour) or `OpenAI-compatible`. It only appears with your own key, next to the API URL. With OpenAI-compatible, the API URL and a Custom model ID (e.g. `gemini-2.5-flash`) are required.
2. **Translate at one boundary** in `src/app/api/bot/route.ts`: a new `callOpenAI()` next to `callClaude()` that turns our messages into OpenAI ones and the reply back into the same `{ content, stop_reason, usage }` shape. The tool loop, tools, sources and debug panel stay unchanged.
   - Tools: `{ name, description, input_schema }` → `{ type: "function", function: { name, description, parameters } }`.
   - System prompt → a `system` message; `tool_use` blocks → `tool_calls`; `tool_result` blocks → `role: "tool"` messages.
   - `finish_reason`: `tool_calls` → `tool_use`, `length` → `max_tokens`, `content_filter` → `refusal`.
   - Auth: `Authorization: Bearer <key>`. No Anthropic-only extras (cache_control, effort, fallbacks, workspace ID).
   - Last round: `tool_choice: "none"`.
3. **URL**: for OpenAI format, `readApiUrl` adds `/chat/completions` (not `/v1/messages`). Same safety rules (https only, no local/IP hosts, needs your own key).
4. A short hint under the field with the Gemini base URL as an example.

## Files touched
- `src/lib/bot.ts`: `readApiUrl(value, format)`, the translation helpers (pure, so they can be tested).
- `src/app/api/bot/route.ts`: `apiFormat` in the body, `callOpenAI()`.
- `src/lib/bot-client.ts`: `apiFormat` setting (kept with the key).
- `src/components/Assistant.tsx` (Trin's area): the format picker and hint.
- `tests/bot.test.mjs`, `tests/bot-route.test.mjs`: translation and an offline route test with a fake OpenAI-style server.
- `README.md`, LIB `file-bot`.

## Risks / needs OK
- Needs OK from proud (owner of the bot) and a glance from Trin (Assistant panel).
- Non-Claude models follow the tool instructions less reliably; answers may be weaker. Only tested against a fake server unless someone has a Gemini key to try.
- No new packages.
- Code freeze / submission today: don't merge to `main` without the team's OK (merging deploys).

## How we'll verify
- `npm run typecheck`, `npm test`, `npm run build`.
- Offline route test: fake OpenAI server asks for `search_files`, gets the result, answers; check the request shape (Bearer, tools, tool messages).
- If a Gemini key is available: one real question in the browser locally.
