# Plan: Assistant replies as formatted text

<!-- Filename: YYYY-MM-DD-<slug>.md. Never delete a plan: set its status instead. -->

**Status:** done
**Date:** 2026-10-22 · **Superseded by:** —

Asked for by Trin (screenshot of the live Assistant, 2026-10-22, passed on by Trin's main session). The details below are
Claude-Trin's choices; Trin can change them before the commit.

## Why
The Assistant window (`src/components/Assistant.tsx`) and chat's private `@cocommit` replies (`src/app/chat/page.tsx`)
print the bot's answer as plain text, so Markdown shows as literal `**`, `-` and backticks:
`- **#1: "Add PassportSignup folder …"**, by @owlwee-sudo, from \`passport-signup-folder\` into \`main\`.`

## Approach
1. **Reuse the Legal page's reader** (`src/lib/markdown-lite.ts`, pure, no HTML output) instead of writing a second one.
   It already does paragraphs and line breaks, bullet and numbered lists, bold, italic, inline code, headings 1-4, links
   (only http, https, mailto, #anchor), bare URLs, quotes, rules and tables. Add what bot replies need:
   - **fenced code blocks** (```` ``` ```` and `~~~`, optional language word, unclosed fence runs to the end), also right
     after a paragraph line and inside list items.
2. **One renderer, two looks** (`src/components/Markdown.tsx`): `variant="page"` (today's Legal page, unchanged) and
   `variant="reply"` (compact, text size of the bubble, colours from `currentColor` so it reads on the paper-white
   bubble and on chat's card). In a reply: no heading ids (several replies on one page would repeat ids), `#anchor`
   links show as plain text, web links open in a new tab with `rel="noopener noreferrer"`, code blocks scroll sideways
   inside the bubble, long inline code and URLs wrap.
3. **Use it** for the Assistant's answers and chat's private `@cocommit` replies. Error messages, user questions and
   normal chat messages stay plain text. "Share to chat" still posts the plain Markdown text (unchanged).

## Safety
Bot replies are untrusted. Still no `dangerouslySetInnerHTML`: the parser returns plain objects and the renderer builds
React elements, so `<script>` and other tags show as text. Links keep the existing allow-list (`safeHref`).

## Files touched
- `src/lib/markdown-lite.ts`: code fence block, fence-aware lists and paragraphs.
- `src/components/Markdown.tsx`: `variant` prop with a `reply` look.
- `src/components/Assistant.tsx`, `src/app/chat/page.tsx`: render answers with `<Markdown variant="reply">`.
- `tests/markdown-lite.test.mjs`: fences, the screenshot's reply, a bot-style answer, unsafe input.
- LIB `file-bot`, `figma-ui` (one line each), LOG, HANDOFF.

## Not in scope
- Shared answers and normal messages in chat stay plain text (ask Trin whether shared `🤖 @cocommit` messages should
  render too).
- Strikethrough, images, raw HTML, syntax colouring, headings 5-6.

## Verification
- `npm test`, `npm run typecheck`, `npm run build`.
- Browser pane, fake mode (no Claude key locally): feed the screenshot's reply and a longer sample (heading, nested
  list, numbered list, code fence with a long line, link, `<script>` text) through the Assistant at 1440 px and 375 px;
  no sideways page scroll, links have `target="_blank"` and `rel="noopener noreferrer"`. The Legal page still looks the same.
