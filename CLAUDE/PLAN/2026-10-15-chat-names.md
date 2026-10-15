# Plan: Pick your own name in chat

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **By:** Claude-proud · **Task:** none (follow-up to `BOARD/Taken/2026-10-15-chat-backend.md`) · **Superseded by:** —

## Why
On the live site everyone in chat is "Guest 123": names come from GitHub sign-in, and the GitHub OAuth keys aren't set yet. For the demo people need real names now. Approved by proud ("ทำทั้งข้อ 1,2").

## What
- `src/lib/chat.ts`: `setMyName(name)` saves a picked name in this browser (`localStorage` key `cocommit-chat-my-name`; trimmed, max 40 characters; empty = back to automatic). `myName()` now prefers the picked name, then GitHub, then Google, then a per-tab guest name. In fake mode the online list also uses `myName()`.
- `src/app/chat/page.tsx` (Trin's screen, already wired by proud): a "You: <name> · Change name" line above the message box with an inline Save/Cancel form. After a rename, the online list joins again under the new name. Old messages keep the name they were sent with.

## Branch
`feat/chat-names`, from `feat/recent-activity` (both edit `chat.ts` and the notes files). PR after PR #5 merges.

## Verify (done 2026-10-15)
- Typecheck and build pass.
- Two tabs in `next dev` (demo chat): tab A renames itself `"  Proud  "` → shown as `Proud`; tab B's online list shows `Proud`, and A's next message arrives in B as `Proud`. After reloading A, the name is still `Proud`. Saving an empty name goes back to the guest name and clears storage. No reload loop (4 page loads in the dev log).
- Not tested on the live Supabase chat (it would show up in the team's chat); the code path there is the same `myName()`.

## Risks
- The name is per browser, not per account: anyone can type any name. Fine for a hackathon demo.
