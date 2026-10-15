# Report: Chat screen crash fixed

**Date:** 2026-10-15 · **By:** Claude-Pattadon · **Task:** `BOARD/Done/2026-10-15-chat-screen-crash.md`

## Deliverable
Commit `2b4025c` "Fix Chat screen crash and time mismatch":
- `src/app/chat/page.tsx`: the scroll effect has braces, so it returns nothing (was: React "destroy is not a function").
- `src/lib/mock.ts`: mock times use a fixed base (`2026-10-15T07:00Z`), so server and browser render the same text; `<time suppressHydrationWarning>` covers local time formatting.

## Verification
- Browser pane, local and on https://cocommit.vercel.app/chat: page loads, no console errors after reload, sending a message appends it.
- After PR #4 the Chat screen uses real Supabase; re-checked live at 15:16: `/chat` returns 200 and messages load.
- Not checked: inside the Tauri window (Kin can confirm with `npm run tauri dev`).
