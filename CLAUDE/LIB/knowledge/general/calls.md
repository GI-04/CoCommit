# Calls with LiveKit

**Added:** 2026-10-16 · **Kind:** reference

## Takeaway
`/calls` → **Join call** puts a LiveKit call (voice, video, screen share) inside CoCommit. There's one room per repo, and only signed-in people can join. Without the three `LIVEKIT_*` keys, the page says "Calls aren't set up yet" and nothing breaks.

## Details
- **Why not Discord:** Discord has no API to embed its calls in another app, and its web client refuses to load inside a frame. A bot can join voice but can't do video. So we use LiveKit (already in the stack).
- **Token:** `POST /api/livekit-token {"repo":"owner/name"}` → `{token, url, room}`. `src/lib/livekit-token.ts` signs the token as an HS256 JWT (`iss` = API key, `sub` = identity, `video` grant with roomJoin/canPublish/canSubscribe/canPublishData, 6 h) using `node:crypto`, so there's no `livekit-server-sdk`. Server only: never import it from browser code.
- **Who may join:**
  - A real Supabase account gets identity `sb:<user id>`; otherwise a GitHub session gets `gh:<login>`. Anonymous visitors get 401.
  - Local dev with no Supabase and no GitHub keys lets a `guest:*` in so the screen can be tried.
- **Room:** `cocommit-<owner>-<repo>`, lowercased; anything except a-z, 0-9 and `-` becomes `-`. The page uses the same fixed repo as chat (`repos[0]` in `src/lib/mock.ts`).
- **The call stays on across pages (PLAN/2026-10-16-call-stays-on.md):** the `LiveKitRoom` lives in `CallProvider` inside `AppShell` (`useCall()`: `call`, `join(repo)`, `leave()`, `stage`), loaded on demand. `/calls` hands its `cc-call` div to the provider as the stage and the `VideoConference` is portaled there; every other page gets a fixed call bar (`CallBar` in `CallRoom.tsx`: mic, camera, a live video thumbnail, **Pop out** to picture-in-picture, Back to call, Leave). Only one audio renderer is mounted at a time. Internal links must be `next/link`: a plain `<a>` reloads the page and ends the call. Pure helpers: `src/lib/call-session.ts` (tests `tests/call-session.test.mjs`). Checked locally with a fake token and a server that never answers (one connection across `/calls` → `/chat` → `/repo` → `/home`), and live in a **real two-person call** (Kin in the Windows desktop app with Pattadon, 2026-10-16): the same `RTCPeerConnection` stayed `connected` on `/chat`, `/repo`, `/home`, with the bar and audio (PR #37; report `OUTPUT/2026-10-16-0510-call-stays-on.md`). Testing tip: count `RTCPeerConnection`s through the WebView2 debug port to tell "kept" from "reconnected".
- **Screen:**
  - `src/components/CallRoom.tsx` wraps `LiveKitRoom` + `VideoConference` from `@livekit/components-react` with `@livekit/components-styles`. The page loads it with `next/dynamic` and `ssr: false`.
  - You join with the mic on and the camera off.
  - **Chat in the call** is CoCommit's repo chat (`src/components/CallChat.tsx`, using `src/lib/chat.ts`), not LiveKit's: messages are saved, show up in `/chat`, and git events show up beside the call. LiveKit's Chat button is hidden by `.cc-call .lk-control-bar .lk-chat-toggle` in `globals.css`. Pinning, decisions and @cocommit stay on `/chat`.
  - A failed connection (`onError` with a `ConnectionError`) returns to the Join button with the error message. Any other `onError` (for example a refused mic) keeps you in the call, listening only, with a note.
  - The size sits on a wrapper `div`, because LiveKit's CSS overrides Tailwind classes on the room (GOTCHAS 2026-10-16).
- **Tested 2026-10-16** against the real LiveKit Cloud project (region India South): two tabs in room `cocommit-gi-04-cocommit` saw each other, and Leave works. Pattadon tested mic and camera in Safari. Live since PR #26 (`ac7e87a`); signed out, the live token route returns 401.
- **Keys:** `NEXT_PUBLIC_LIVEKIT_URL` (`wss://<project>.livekit.cloud`), `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`, from a LiveKit Cloud project → Settings → Keys. Put them in `.env.local` and in Vercel (Production). Then redeploy, because `NEXT_PUBLIC_*` is baked in at build time.
- **Desktop:** `src-tauri/Info.plist` adds camera/mic usage text for macOS, but the installers must be rebuilt for it to apply. Windows WebView2 asks for permission by itself. Not tested in the desktop app yet.

## Sources
- `CLAUDE/PLAN/2026-10-16-livekit-calls.md`
- `tests/livekit-token.test.mjs`
- LiveKit token format: https://docs.livekit.io/home/get-started/authentication/
