# Plan: Keep the call going while you use the rest of the app

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —
**Proposed by:** Kin (with Claude-Kin) · **Needs OK from:** Pattadon (owner of the calls code, `PLAN/2026-10-16-livekit-calls.md`)

## Approval (2026-10-16, Pattadon via Claude-Pattadon)
**Approved**, with one addition: **picture-in-picture** (below). Pattadon's note for Claude-Kin: "I'm back you lil sh.."

## Why
During a call you can't use anything else: leaving `/calls` ends the call. The `LiveKitRoom` and the "joined" state live inside the `/calls` page (`src/app/calls/page.tsx`, `src/components/CallRoom.tsx`). Moving to another page unmounts that page, which disconnects the room. For the demo you'd want to talk while showing Repo, Chat or Context.

## Approach
Keep the call in the part of the app that never unmounts (`AppShell`, used by `src/app/layout.tsx`), and only *show* it differently per page.

1. **Call state in the shell:** a small `CallProvider` (`src/components/CallProvider.tsx`) inside `AppShell`. It holds `{ repo, url, token } | null` and offers `join(repo)` (the same `/api/livekit-token` request as today) and `leave()`. The `LiveKitRoom` renders **here**, once, while joined, so changing pages doesn't touch the connection.
2. **What you see:**
   - **On `/calls`:** the full view as today (`VideoConference` + `CallChat`). The page gives the shell a spot to put it, and the room's view is drawn there with a React portal. Same room, no reconnect.
   - **On every other page:** a small **call bar** fixed at the bottom-right: the room name, mic and camera on/off, **Leave**, and **Back to call** (to `/calls`). It uses LiveKit's own controls (`TrackToggle`, `DisconnectButton`).
   - **Audio** keeps playing everywhere: one `RoomAudioRenderer` stays mounted in the shell (`VideoConference` already includes one, so only one is mounted at a time to avoid double audio).
3. **Links that reload the page drop the call**, so internal links become Next.js `Link`: `/chat` in `CallChat.tsx`, "Change name" (`/profile`) and "Log in" on the chat page. Signing out (`location.assign("/login")` in `UserChip.tsx` and `/profile`) still reloads, and ending the call there is fine.
4. **`/calls` page:** "Join call" and "Leave call" go through the provider; the page no longer owns the room. The error handling (`onError` / `onMediaDeviceFailure` and the device-blocked note) moves into the provider and stays the same.
5. **Desktop app:** nothing changes in `src-tauri/`: the window loads the live site, so it gets the fix after the deploy.

6. **Picture-in-picture (added by Pattadon, optional):** a **Pop out** button on the call bar and on `/calls` that floats the video in the browser's Picture-in-Picture window (`requestPictureInPicture()` on the active video element, or the Document PiP API where available), so you still see people while using other apps. Hide the button when the browser doesn't support it. The desktop webview may not support it: try it, and if it doesn't work there, ship without it (it must not block the merge). Leaving the call closes the PiP window.

## Files touched
- `src/components/CallProvider.tsx` (new: context, `LiveKitRoom`, call bar, portal target)
- `src/components/AppShell.tsx` (wrap children in the provider)
- `src/app/calls/page.tsx`, `src/components/CallRoom.tsx` (use the provider; full view through the portal)
- `src/components/CallChat.tsx`, `src/app/chat/page.tsx` (internal `<a>` → `Link`)
- `tests/`: the provider's join/leave logic with a fake token request (no real LiveKit)
- `CLAUDE/LIB` `calls` note

## Risks / needs OK
- **Touches Pattadon's calls code and the shell every page uses.** It's small, but a mistake in `AppShell` shows on every page. Mitigation: nothing renders unless you've joined a call.
- **Can't connect a real call on Kin's PC** (no LiveKit keys in `.env.local`). Local checks cover the join/leave logic, the bar's layout with a stubbed room, and that pages still load. A **real two-person call** needs Pattadon's machine (keys in `.env.local`), or the live site right after merging.
- **Merging auto-deploys,** so merge well before ~09:00 (`AUTO_DEPLOY=off` for the demo) to leave time for a live two-person test. If it isn't tested by then, keep it off `main`; the demo still works by staying on `/calls`.
- About 2 h.

## How we'll verify
- `npm run typecheck`, `npm run build`, `npm test` (+ provider tests).
- Local (no keys): every page loads; "Join call" shows the server's error cleanly as today; with a stubbed room, the bar shows on `/repo`, `/chat`, `/home` and not on `/calls`; Leave clears it.
- With keys (Pattadon's machine, or live after merge), two people:
  - join on `/calls` → open Repo, Chat and Context → still talking, the bar shows, mic/camera toggles work;
  - Back to call → full view with video;
  - Leave from the bar ends the call for you only;
  - the same in the desktop app.
