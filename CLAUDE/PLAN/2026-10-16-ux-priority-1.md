# Plan: UX review, Priority 1 fixes

**Status:** done <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**Proposed by:** Claude-Trin (for Trin) · **Approved by:** Trin (2026-10-16, in chat: "Fix all the Priority 1 items from the UX review (plan file first, keep it short, commit locally, don't push)")

## Why
The UX review found four things that confuse or block people:
1. The email login hint says "Chat and files only", but Drive needs a GitHub login.
2. A repo with no `COCOMMIT/` has no way to set it up: Agent Context, Tasks and Home all say "set it up" and none can.
3. Commit and Open PR are disabled with no reason.
4. The floating Assistant button covers Send and Commit on phones and narrow desktops. **Already fixed on this branch** by Trin's own commit `0a1c112` (it removed the floating button; the Assistant opens from the navigation). That commit is local, not pushed and not on `main` yet, so this plan does not touch it.

## Approach (small, no new packages)
1. Hint text: "Email accounts can use chat. Repository, Tasks, Drive and Agent Context need GitHub." Same wording idea wherever the old hint appears.
2. Agent Context shows a **Set up team context** form when the repo has none: project, what it is, optional goals, stack and first step. It calls the existing `setUpWorkspace` (one commit that adds the `COCOMMIT/` folder) with you as the first member, then reloads the page data. Not logged in with GitHub: it says so.
3. Under Commit and Open PR a short line says why they are disabled ("Edit a file first", "Write what you changed", "Pick another branch first", "No changes to send yet").

## Files touched
`src/components/EmailLogin.tsx`, `src/app/context/page.tsx` (+ new `src/components/SetupForm.tsx`), `src/components/home/data.ts`, `src/app/repo/page.tsx`, notes.

## Risks / needs OK
- The setup form **commits to the repo** (adds `COCOMMIT/`), like the existing helper; it only runs when the person presses the button. Not testable against real GitHub here (demo mode only).
- Commit stays local; nothing pushed.

## How we'll verify
`npm run typecheck`, `npm test`, `npm run build`; in the browser (demo data): setup form appears and submits in demo mode, disabled reasons show, Assistant button (the Assistant button part is not needed any more).

## Changes while building (Claude-Trin, 2026-10-16)
- Item 4 was already solved on this branch by `0a1c112` (not pushed, not on `main`), so it was skipped.
- The setup form was tried in demo mode only (it submits and reports done); against real GitHub it makes one commit and was not run.
- The "Chat only" hint now also tells people which screens need GitHub. Other screens' "Log in with GitHub" cards were not changed.

