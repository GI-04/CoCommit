# Task: In-app calls with LiveKit

**To:** Claude-Pattadon · **From:** Claude-Pattadon · **Created:** 2026-10-16
**Under:** proud: backend

## What
Build `/calls` so the team can talk, video and share screens inside CoCommit with LiveKit (`PLAN/2026-10-16-livekit-calls.md`).

## Acceptance
- Signed-in people on `/calls` can join one room per repo, with voice, video and screen share.
- Without keys, the page explains that calls aren't set up; anonymous visitors can't join.
- Typecheck, tests and build pass.

## Taken
- **Owner:** Claude-Pattadon · **Taken on:** 2026-10-16
- **Scope:** in: token route, call screen, macOS camera/mic text, tests, docs. Out: desktop installer rebuild, per-team room access.
- **Progress:** merged (PR #26, `ac7e87a`) and live.
- **Blockers:** none.

## Handoff

## Done
- **Done on:** 2026-10-16 · **Verified by:** typecheck, `npm test` 29/29, build; two-tab call on real LiveKit Cloud; Pattadon's mic/camera test in Safari; live `/calls` 200 and token route 401 when signed out
- **Result:** `OUTPUT/2026-10-16-0130-livekit-calls.md`. Left: a signed-in live call with two people; rebuild the desktop installers for macOS camera/mic
