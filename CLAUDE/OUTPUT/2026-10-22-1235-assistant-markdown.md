# Deliverable: Assistant and @cocommit answers as formatted text

<!-- Filename: YYYY-MM-DD-HHMM-<slug>.md. Reusable: someone with no context should be able to rely on this and re-run the verification. -->

**Date:** 2026-10-22 12:35 · **By:** Claude-Trin · **Result:** ✅ done (PR #70, not merged)
**Plan:** `PLAN/2026-10-22-assistant-markdown.md` · **Task:** none (asked for in Trin's session)

## Goal
Show the bot's Markdown answers as real lists, bold, code and links instead of literal `**` and backticks, safely.

## What changed
- `src/lib/markdown-lite.ts` — the Legal page's reader now also reads ``` / ~~~ code fences (language word, unclosed fence runs to the end), also right after a paragraph line and inside list items (blank lines kept); nested blocks are dedented before parsing.
- `src/components/Markdown.tsx` — one renderer, two looks: `variant="page"` (Legal page, markup unchanged) and `variant="reply"` (bubble text size, colours from `currentColor`, headings as h3-h6 without ids, `#anchor` links as text, code blocks and tables scroll sideways inside the bubble).
- `src/components/Assistant.tsx` — answers use `<Markdown source={m.text} variant="reply" />`; error messages stay plain text; bubble gets `min-w-0`.
- `src/app/chat/page.tsx` — the private `@cocommit` reply uses the same renderer. Posted chat messages (incl. "Share to chat") stay plain text.
- `tests/markdown-lite.test.mjs` — 7 new tests: the live screenshot's answer, fences, fences in lists, a bot-style answer with unsafe links and tags, odd fences, and a source check that no file uses `dangerouslySetInnerHTML`.

## Verification
- `npm test` → 244/244 pass; `npm run typecheck` → clean; `npm run build` → passes (Tailwind emits `color-mix(in oklab, currentcolor 10%, transparent)` for `bg-current/10`).
- Browser pane on a production server from this worktree (`npm run build`, then `npx next start -p 3011`; fake mode, no Claude key). `/api/bot` stubbed in the page with `window.fetch` so the real Assistant UI got (1) the live screenshot's answer and (2) a long sample (heading, numbered list with nested bullets and a fenced block, bash fence, quote with `<script>`/`<img onerror>`/`javascript:` link, 3-column table, rule, line break, bare URL).
  - Screenshot's answer: a real bullet, bold title, `passport-signup-folder` and `main` in monospace.
  - Links: `target="_blank"`, `rel="noopener noreferrer"`; the `javascript:` link is plain text; no `<script>`/`<img>` elements in the bubble.
  - 1024 px (desktop layout) and 375 px: page `scrollWidth - clientWidth` = 0; code blocks scroll inside the bubble (375 px: 221/1082 px); the table scrolls in its box.
  - Chat (`/chat`, demo mode): `@cocommit …` reply renders the same at desktop and 375 px, no sideways scroll, no console errors.
  - `/legal`: same 456 elements with the same classes and 39 heading ids as the live site.

## Issues / not done
- Shared answers (`🤖 @cocommit: …` messages posted with "Share to chat") still show raw Markdown in chat; left as a question for Trin.
- Not checked: a real Claude answer (no key locally), Safari/Firefox, a real phone, the live site (needs a merge).
- Not supported on purpose: strikethrough, images, raw HTML, syntax colouring, headings 5-6.

## Uncommitted work
No. Committed as `9f5f69f` on `trin/assistant-markdown`; PR #70 (https://github.com/GI-04/CoCommit/pull/70).
