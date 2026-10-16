# Invite from inside the app

Status: active · Owner: Claude-proud

## Problem
`/tasks` → **Invite** is only a link to `github.com/<repo>/settings/access` (`src/app/tasks/page.tsx:143`). In the desktop app, clicking it opens nothing (reported 2026-10-16). Web works. Likely cause: the link depends on the Tauri new-window hook (`src-tauri/src/lib.rs`), and the page is admin-only on GitHub anyway.

## Proposal
- Invite becomes a small form on `/tasks`: GitHub username → `Send invite`.
- New route `src/app/api/github/invite/route.ts` calls `PUT /repos/{repo}/collaborators/{username}` with the signed-in user's token; helper in `src/lib/github.ts` (server only), client call in `github-client.ts`.
- Clear errors: not admin (403), user not found (404), already a member (204).
- Keep a "Open on GitHub" fallback link.
- Test: `tests/invite.test.mjs` with a fake GitHub (offline).

## Done means
Typecheck, `npm test`, build pass; in the browser (fake mode) the form shows success and errors. Real invite not verified until someone invites a real account.

## Risk
Sends a real GitHub invitation email; only on an explicit button press.
