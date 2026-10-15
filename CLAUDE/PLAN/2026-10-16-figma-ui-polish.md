# Plan: Figma look, polish pass (as close to the design as the real data allows)

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**Proposed by:** Claude-Trin (for Trin) · **Approved by:** Trin (2026-10-16, in chat: "make the app look like in figma as much as possible"). Continues `PLAN/2026-10-16-figma-ui.md` (done), whose "out of scope" list this plan now takes on.

## Why
Phases 1 and 2 gave the whole app the Figma colours, glass navigation and Home. Side by side with the Figma frames the structure is still different: the navigation is not grouped like the design (Messages = Chat / Team / Call, Drive, Assistant), Messages has no side panels, Repository has a different layout, Drive is a plain list, Profile and Context are not tabbed, the Assistant window is missing and the landing page has its own look.

## Rules for this pass
- Same rule as before: **real data only**. Where the design shows something the app has no source for (Personal/Shared drive tabs, 2-factor, sessions, Slack, stats like "Pull requests"), it is left out, not mocked.
- Routes stay (`/chat`, `/tasks`, `/calls`, `/files`, …); only the way they are grouped and laid out changes.
- No new packages. Commits stay local until Trin says push (PR #39 is open).

## Approach (each step is its own commit)
1. **Navigation and Messages:** sidebar like Figma: Home, Repository, Drive (`/files`), Messages (`/chat`; also active on `/tasks` and `/calls`), Agent Context, Assistant (opens the window). The account chip shows the email under the name. Chat / Team / Call become link tabs in a shared "Messages" header on those three pages. Chat gets the Figma two-panel layout: a list on the left (# general and the user's repos, each a live channel) and the conversation on the right with the online people in its header. Team (`/tasks`): a "Teams" list (the user's repos; picking one switches the repo), the board, an Invite button (GitHub's access page) and a Members section from COLLAB.md. Call: same list, cyan call card.
2. **Assistant window:** blue round button bottom-right on every app page and the sidebar item open the Figma window (header with spark icon, expand / minimise / close, cyan question bubbles, paper answer bubbles, round blue send). It is the existing `@cocommit` bot (`POST /api/bot`), so it answers from the repo's `COCOMMIT/` files and shows its sources; without `ANTHROPIC_API_KEY` it says it isn't set up.
3. **Repository:** Figma layout: left a white card with Changes / Files tabs, below it the pink Commit card (message, optional new branch, Commit, Open PR); right the dark diff panel with line numbers and a Diff / Edit switch. Same API calls as today.
4. **Drive, Profile, Context:** Drive = grid of coloured file cards with an Upload button and grid/list switch (title "Drive"). Profile = Overview / Account tabs, Sign out in the header, Personal info, Connected accounts, Security (password, email). Context = tab pill (Instructions, Handoff, Team, Decisions, Gotchas, Log, To-do, Board) now reading the real `COCOMMIT/` files with `loadWorkspace` (read-only, with "Edit on GitHub" links), replacing the demo text.
5. **Landing page:** glass pill header, centred hero, colour-block feature cards, "Get CoCommit" block and footer as in the Figma landing frames; keep the existing copy and the interactive demo.
6. **Details:** spacing, radii, font sizes and states compared frame by frame at 1440 / 834 / 390 px.

## Files touched (expected)
`src/components/Nav.tsx`, `UserChip.tsx`, new `src/components/{MessagesShell,ListPanel,Assistant}.tsx`, `src/lib/sections.ts` (nav list), `src/app/{chat,tasks,calls,repo,files,profile,context}/page.tsx`, `src/app/page.tsx` + landing components, `src/components/{LocalRepo,FileBrowser}.tsx` if needed, `CLAUDE/` notes.

## Risks / needs OK
- **Big UI restructure of Repository, Chat, Profile, Context** on a branch with an open PR. Behaviour (commit, PR, send message, tasks moves, uploads, profile saves) must not change; each page is checked after its change.
- Context stops showing the demo text and shows the real files: signed out it asks to log in, and a repo without `COCOMMIT/` says so. Editing the files stays on GitHub for now (the save helpers exist; a form is a separate step).
- The Assistant answers need `ANTHROPIC_API_KEY` (server); not testable here. The window, errors and layout are.
- Teammates are changing `chat`, `calls`, `tasks` (recent merges): expect some rebasing.

## How we'll verify
`npm run typecheck`, `npm test`, `npm run build`; browser at 390 / 834 / 1440 px on demo data after each step, compared with the Figma screenshots; no horizontal scroll; existing flows still work (send a chat message, edit and commit a file in demo mode, move a task, upload a file).
