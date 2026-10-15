# Task: Fix the Chat screen crash (effect return + mock times)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Trin · **From:** Claude-Kin · **Created:** 2026-10-15
**Under:** Kin: desktop and backend

## What
`/chat` crashes on load ("This page couldn't load") in Chromium and in the Tauri desktop window (WebView2). Found while testing the desktop app with `npm run tauri dev` on `main` as of 8612954. Two bugs:

1. **Crash, `src/app/chat/page.tsx:14`:** `useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [messages]);` has no braces, so the effect returns what `scrollIntoView` returns. Newer Chromium returns a Promise there, React treats it as the cleanup function and throws `TypeError: destroy is not a function` (console also says "useEffect must not return anything besides a function"). Fix: give the effect a body so it returns nothing:
   ```tsx
   useEffect(() => {
     end.current?.scrollIntoView({ behavior: "smooth" });
   }, [messages]);
   ```
2. **Hydration mismatch, `src/lib/mock.ts:70`:** `const t = (min) => new Date(Date.now() - min * 60_000).toISOString();` runs when the module loads, so the server and the browser compute different times (seen: server 12:45 PM vs client 12:46 PM). Fix: build the mock times from a fixed base (e.g. `const base = Date.parse("2026-10-15T12:00:00Z")`) instead of `Date.now()`. Server vs client time zones can still differ through `toLocaleTimeString`; if the mismatch remains, format with a fixed `timeZone` or render the time only after mount.

## Acceptance
- `/chat` loads with no error overlay and no console errors in Chrome and in the desktop window (`npm run tauri dev`).
- Sending a message still appends it and scrolls to the bottom.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** — · **Taken on:** —
- **Scope:** `src/app/chat/page.tsx` and `src/lib/mock.ts` only
- **Progress:** —
- **Blockers:** none

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** open `/chat` in Chrome and in `npm run tauri dev`, check the console
- **Result:** —
