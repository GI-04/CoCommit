# Deliverable: Account profile and settings

**Date:** 2026-10-15 · **By:** Codex-Pattadon · **Result:** implemented and locally verified
**Plan:** `PLAN/2026-10-15-account-profile.md` · **Task:** `BOARD/Done/2026-10-15-account-profile.md`

## Goal
Let users view their account and persist edits to their supported profile/login details.

## What changed
- `/profile`: account summary, name and HTTPS avatar-URL editing with preview/fallback, email/password settings for email identities, pending email confirmation state, separate GitHub account/settings links, combined sign-out, loading/error/signed-out states.
- `src/lib/profile.ts`: verified account reads, input validation, durable Supabase Auth metadata saves, own-row public profile mirror, password reauthentication for credential changes. No new migration or packages.
- Sidebar name/avatar opens the profile page and refreshes after saves/auth events. Existing login return paths are preserved.
- Future chat messages resolve the saved CoCommit name freshly instead of keeping a cached name. Past messages and online presence are not rewritten.
- Responsive navigation stacks above content below the desktop breakpoint, with Coming Soon links hidden on small screens.
- Combined sign-out now detects GitHub failure rather than claiming success.

## Verification
- Typecheck passed.
- 16 controlled tests passed: account/provider boundaries, anonymous rejection, validation, save/reload, own-row field scope, partial table sync, failed saves, credential verification, email confirmation, new chat names, failed sign-out and provider-specific rendered forms.
- Production build passed with Webpack; `/profile` is generated successfully. Default Turbopack failed because internal local-port binding was blocked, including after an escalated retry; see GOTCHAS.
- Actual production-built signed-out page checked in browser at 390×844 and 1280×900, with zero captured warnings/errors. Signed-in forms were rendered in controlled tests, not through a live signed-in browser session.
- Whitespace diff check passed.

Re-run checks (same commands on both platforms):

```zsh
npm run typecheck
```

```powershell
npm run typecheck
```

```zsh
node --test tests/profile.test.mjs
```

```powershell
node --test tests/profile.test.mjs
```

```zsh
npm run build -- --webpack
```

```powershell
npm run build -- --webpack
```

## Issues / next step
- No real account details, passwords or emails were changed during verification. Check authenticated save/reload, sidebar/chat, email confirmation and password update with a real test account. Pattadon authorized production deployment after reviewing this limitation.
- GitHub-only account editing remains on GitHub, as approved. CoCommit editing requires a non-anonymous Supabase account; no silent identity linking or OAuth scope expansion.
- A missing/stale public profile row does not block the saved Auth profile, but produces a partial-sync notice. The existing profiles SQL/trigger remains unchanged.

## Uncommitted work
Pattadon authorized committing, pushing to main and deploying on 2026-10-15. Release preparation includes this feature and supporting project notes. Rollback deployment before this release: `https://cocommit-l66vm0d6k-gi-04.vercel.app`. Deployment outcome will be recorded in the handoff.
