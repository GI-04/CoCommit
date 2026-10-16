# Plan: team spines on Home → Overview, file tools on Repository

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**Proposed by:** Claude-Trin (for Trin) · **Approved by:** Trin (2026-10-16, in chat: answered the plan questions, "Build now")

## Why
Trin sent three screenshots of the live site:
1. Home → Overview has a **Team** card that is still a flat list (long agent names cut off, agents counted as members). Trin wants it like Messages → Team → Members (picture 2): one colour bar per person, agents hanging under them, tap to read more.
2. Repository: Trin wrote "Add Tools: copy code, download, assistant" on the toolbar of the file view.

## Approach (no new packages)
- **Overview → Team:** reuse `TeamSpines` (`src/components/TeamSpines.tsx`, `groupTeam` in `src/lib/team.ts`) inside the Team card, all members (not just 8), no message/call buttons. Empty, loading and "log in" states stay.
- **Repository file tools:** three glass pill buttons for the open file: **Copy** (the file's text, including unsaved edits, to the clipboard; the button says "Copied" for 2 s), **Download** (the same text as a file with the file's name), **Ask Assistant** (opens the Assistant and asks it about that file in the picked repo and branch). They are disabled with a reason when no file is open, and Copy / Download tell the person if the browser blocks them.
- **Assistant:** `AssistantProvider` gets `ask(question)`: it queues the question, opens the window, and the dock asks it as soon as it is ready (one place; the Context page's "Ask assistant" keeps working).
- Placement and wording: see the questions below; defaults are the recommended options.

## Files touched
`src/components/home/OverviewTab.tsx`, `src/app/repo/page.tsx`, `src/components/Assistant.tsx`, a small pure helper `src/lib/file-tools.ts` (download name, file type) with `tests/file-tools.test.mjs`; notes (LIB `figma-ui`, HANDOFF).

## Risks / needs OK
- Merging to `main` deploys; the code freeze ended at 13:00 but merges need the team's OK; submission is due 14:00, so I keep this small.
- "Ask Assistant" needs the Assistant's API key to be set (same as today); without it the window says so.
- Copy uses the Clipboard API (HTTPS or localhost only; the live site and the desktop app qualify).
- Commits stay local until Trin says push.

## How we'll verify
`npm run typecheck`, `npm test` (new helper test), `npm run build`; browser on demo data: Overview Team card (people with agents under them, expand, phone width), Repository: open a file → Copy puts the text on the clipboard, Download gives a file with the right name and content, Ask Assistant opens the Assistant with the question, buttons disabled with no file.

## Changes while building (Claude-Trin, 2026-10-16)
- Trin's answers: tools in the **file header** next to Diff / Edit; **Assistant** opens the window and asks about the file; build now (no plan wait, submission due 14:00).
- Built: Overview → Team uses `TeamSpines` (all members, agents under their person, no message/call buttons). Repository file header has **Copy**, **Download**, **Assistant** (glass pills, disabled with "Open a file first"); they act on the text in the editor (unsaved edits included) or, in the Diff view, on the diff (download name gets `.diff`). `AssistantProvider` got `ask(question)` (queues the question and opens the window; the dock asks it when free). New icons `copy` and `download`; pure helpers `downloadName` / `fileQuestion` in `src/lib/file-tools.ts` with tests.
- Checked in the browser (demo data, worktree on port 3300): Overview Team card shows people with their agents; Repository: tools disabled before a file is open, README.md opened → Download makes a file named README.md with the right size, Copy copies the text and the label says "Copied", Assistant opens with "Explain `README.md` in … on the main branch: …" (the demo has no API key, so the answer is the "not set up" message); phone width 390 px: the tools wrap under the file name, no sideways scroll. **Not checked:** a real Assistant answer (needs a key), the clipboard in a real browser tab (the pane's clipboard was stubbed), the desktop app.
- The legal page (`/legal`, from `docs/LEGAL.md`, Trin's later request) was built in the same worktree: see `PLAN/2026-10-16-legal-page.md`.
