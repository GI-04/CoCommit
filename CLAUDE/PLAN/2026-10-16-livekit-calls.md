# Plan: In-app calls with LiveKit

**Status:** done <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-16 · **Superseded by:** —

## Why
proud asked (in a Claude-Pattadon session on Pattadon's machine) for calls that happen inside CoCommit (no redirect to Discord). Discord has no API for embedding its calls, so we use LiveKit, the provider already named in the stack and in `.env.example`. Calls were out of the demo scope (`PLAN/2026-10-15-demo-scope.md`); this brings them in on proud's request.

## Approach
1. **Token (server):** `src/lib/livekit-token.ts` signs a LiveKit access token (a JWT, HS256) with Node's built-in `crypto`, so no `livekit-server-sdk` is needed. `POST /api/livekit-token` (the existing stub) checks that the caller is signed in (a real Supabase account or the GitHub session; anonymous visitors can't join), then returns `{ token, url }` for one room per repo (`cocommit-<owner>-<repo>`). Without the LiveKit keys it answers 503 "Calls aren't set up yet".
2. **Call screen:** `/calls` gets a **Join call** button. After joining, LiveKit's ready-made `VideoConference` component (camera, mic, screen share, participant tiles, leave) runs inside the page. Leaving returns to the button.
3. **Desktop (macOS):** add `src-tauri/Info.plist` with camera and microphone usage text, so the Mac app can ask for access. It only takes effect after the installers are rebuilt (a separate step).
4. **Keys:** `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` from a free LiveKit Cloud project go into `.env.local` and the Vercel project's env vars.

## Files touched
- `src/lib/livekit-token.ts`: new, token signing and room naming.
- `src/app/api/livekit-token/route.ts`: replace the stub.
- `src/app/calls/page.tsx`, `src/components/CallRoom.tsx`: call UI.
- `src-tauri/Info.plist`: new, camera and mic permission text.
- `tests/livekit-token.test.mjs`: token shape, signature and room-name tests.
- `package.json` / `package-lock.json`: `livekit-client`, `@livekit/components-react`, `@livekit/components-styles`.
- `README.md`, LIB, `HANDOFF.md`: how calls work and which keys they need.

## Risks / needs OK
- **Package installs** (ask-first): `livekit-client`, `@livekit/components-react`, `@livekit/components-styles`. OK'd by Pattadon on 2026-10-16 (relayed through proud's session).
- **New account:** Pattadon creates the LiveKit Cloud project (free tier) and puts the keys in `.env.local` and the Vercel env vars (team `gi-04`). Agents don't create accounts or handle secrets.
- A room per repo means anyone signed in who can open that repo page can join. That's fine for the demo; per-team access comes later.
- Merging to `main` deploys to production. Before 09:00 that's fine; after it, follow the demo-freeze rule in HANDOFF.

## How we'll verify
- `npm run typecheck`, `npm test` (new token tests), `npm run build`.
- In the browser: without keys, `/calls` shows "not set up yet" and nothing crashes. With keys, two tabs join the same room and see each other.
