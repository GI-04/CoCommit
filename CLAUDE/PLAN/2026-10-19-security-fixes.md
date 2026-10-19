# Plan: Security fixes, part 1 (sign-in handoff, returnTo, repo membership, headers, bot limits, chat)

<!-- Filename: YYYY-MM-DD-<slug>.md. Never delete a plan: set its status instead. -->

**Status:** active
**Date:** 2026-10-19 · **Superseded by:** —

Approved by Trin in chat on 2026-10-19 (start with items 2 and 1 on `trin/security-fixes`). Asked for after the security review (report kept local and git-ignored on Trin's machine:
`CLAUDE/INBOX/Claude-Trin/2026-10-19-security-review.md`; finding numbers H1, M4… below refer to it).

> This repo is public. This plan names weaknesses but leaves out attack steps. Commit it together with the fixes
> (or after them), not on its own before.

## Progress
- **2026-10-19, Claude-Trin:** items **2** and **1** built on `trin/security-fixes` (not committed). Changes from the
  plan: the shared check stays in `src/lib/login-identity.ts` (already import-free and loaded by tests) instead of a new
  `safe-path.ts`; "same GitHub account" compares GitHub user **ids** (`canSeeRepoAs` in `github.ts`, helpers
  `githubIdOf` / `sameGitHubAccount`), not logins, so renames don't matter. Verified: typecheck, `npm test` 241/241
  (new `tests/desktop-signin.test.mjs`), `npm run build`, local browser with placeholder GitHub keys (return paths,
  a stranger's ticket refused, wrong verifier refused, right verifier accepted, ticket removed from the address bar,
  no-referrer, cross-site/no-Origin POST 403). Not verified: the installed desktop app, real Supabase sign-in.
  Items 3–6 not started.

## Why
The review found nothing critical, but six code areas let a stranger or a free account reach other people's chats,
calls, sessions or the team's AI key. Three settings-only fixes are not part of this plan, because they need no code:
Supabase Confirm email on and anonymous sign-ins off (Pattadon), and the GitHub `production` environment main-only
with a required review (Thor1006).

## Approach

### 1. Desktop sign-in ticket bound to the app that asked for it (H1, M3, M14)
No Rust change and no new installers: the web page in the app window already starts the sign-in (`AppShell.tsx`).
- **Start (app window):** `useGitHubLoginInBrowser` makes a random 32-byte `verifier`, saves it with a timestamp in
  the app window's `localStorage`, and adds `challenge = base64url(sha256(verifier))` to `/api/github/login?desktop=1`.
- **Carry:** `/api/github/login` checks `challenge` (43 base64url characters) and passes it through
  `githubCallbackUrl(…, desktop, challenge)`. `/auth/callback` refuses to make a desktop ticket without one, and seals
  it into the ticket. `TICKET_TTL_MS` drops from 5 minutes to 2.
- **Finish:** the installed app still opens `/auth/desktop/finish?ticket=…` (unchanged Rust). Its GET handler now
  only redirects to a new page `/auth/desktop/confirm?ticket=…`, which sets no cookies. That page reads the verifier
  from `localStorage`, takes the ticket out of the address bar (`history.replaceState`), and sends both to a new
  **POST** handler in the same `finish/route.ts` (JSON, same-origin `Origin` check). The POST handler requires
  `sha256(verifier) === ticket.challenge` before `setSession`. The page then deletes the verifier and goes to `next`.
  A browser or app that didn't start the sign-in has no verifier, so a foreign ticket is useless.
- **One GitHub identity per session:** when a sign-in brings no GitHub token (finish, `/auth/callback`), delete
  `cc_github`. In `/api/chat/join` and `/api/livekit-token`, the GitHub account behind `cc_github` must be the
  Supabase user's own linked GitHub identity (compare logins), or the route answers like "no GitHub".
- `Referrer-Policy: no-referrer` on `/auth/desktop*`.

### 2. One safe returnTo check everywhere (M5)
- New `src/lib/safe-path.ts` (no imports, so tests load it): `safeReturnTo(path, fallback)` accepts only a path
  that starts with a single `/`, has no backslash and no control characters (`\x00-\x1f`, `\x7f`), and still has
  our origin after `new URL(path, "https://x.invalid")`.
- Use it in `src/app/login/page.tsx` (still refusing `/login…`), `src/lib/auth-email.ts`, `src/lib/login-identity.ts`
  (re-export, so imports keep working) and the legacy callback in `src/lib/github.ts:109`.

### 3. Repo membership by write access, call room by repo id (H2, M4)
- `canSeeRepo` returns `{ access, id, fullName }` from `GET /repos/{repo}`, which GitHub already answers with the
  caller's `permissions`. **Private repo:** a member is anyone GitHub shows it to (as today). **Public repo:** a member
  needs `push`, `triage`, `maintain` or `admin` (a collaborator); readers get "not a member".
- Call room = `cocommit-repo-<GitHub repo id>` instead of the lossy name mapping, so two repos can't share a room.
  `roomForRepo` keeps validating the name; the room comes from the id the server got back from GitHub.
- `/api/chat/join` records membership only after the same check. Chat stays keyed by the `owner/name` string
  (unchanged table); a renamed or re-registered name is a follow-up (below).

### 4. Security headers (review "headers" finding; also makes M10-type bugs harder to use)
In `next.config.ts` `headers()` for every path:
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(self), microphone=(self), display-capture=(self), geolocation=()`.
- `Content-Security-Policy`: `default-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';
  frame-ancestors 'none'; img-src 'self' blob: data: https://avatars.githubusercontent.com https://github.com
  https://*.googleusercontent.com; media-src 'self' blob:; frame-src 'self' blob:; worker-src 'self' blob:;
  connect-src 'self' https://<supabase>.supabase.co wss://<supabase>.supabase.co <LiveKit https + wss>
  ipc: http://ipc.localhost; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'`.
  The Supabase and LiveKit origins come from the env at build time. `ipc:` / `http://ipc.localhost` keep the
  desktop app's git commands working (Tauri 2 IPC).
- Ship it as `Content-Security-Policy-Report-Only` first, click through every page (including a call and the
  desktop app), then switch to enforcing in the same PR once nothing is blocked.

### 5. Bot limits (M7, M8)
- **Server key** (`ANTHROPIC_API_KEY`) only for GitHub logins in a new env `BOT_ALLOWED_LOGINS` (comma list, e.g.
  the four teammates). Unset means nobody uses the server key, with the message "Add your own API key in Assistant
  settings". Own keys work for everyone, as today.
- On the server key: only the `MODELS` choices, no `custom`; Edit mode at most 10 rounds.
- `/api/bot/apply`: check sign-in **first**, before reading the changes.
- Both routes: at most 100 `exclude` patterns of ≤ 200 characters and ≤ 5 `*` each, paths ≤ 300 characters
  (`cleanPath`), and `globToRegex` replaced by a linear wildcard matcher in `src/lib/bot.ts`.
- Snapshot size caps: `downloadTarball` (`src/lib/github.ts:548`) refuses over 50 MB (Content-Length, and a running
  byte count while reading); `parseTarball` uses `gunzipSync(gz, { maxOutputLength: 200 MB })` and stops after 20,000
  files; the snapshot cache in `bot-tools.ts` evicts by total size (≤ 150 MB) as well as count.

### 6. Chat: the database fixes what a message can claim (M6)
- New `supabase/chat-hardening.sql` (safe to re-run; Pattadon runs it once): `messages_set_author` also sets
  `new.id := gen_random_uuid()`, `new.created_at := now()`, `new.pinned := false`, `new.author_id := auth.uid()`.
  The app never sends these, so nothing breaks. A `profiles.name` check constraint (1–80 characters, no control or
  zero-width characters), added `not valid` so old rows don't block it.
- UI (`src/app/chat/page.tsx`, `src/lib/chat.ts`): decide "my message" by `author_id` instead of the display name;
  show `@login ✓` or "email account" next to every name, git events included, so a lookalike name stands out.
- Git events stay posted from the browser for now (moving them to the server is a follow-up).

## Files touched
- 1: `src/components/AppShell.tsx`, `src/app/api/github/login/route.ts`, `src/lib/login-identity.ts`,
  `src/app/auth/callback/route.ts`, `src/lib/desktop-handoff.ts`, `src/app/auth/desktop/finish/route.ts`,
  `src/app/auth/desktop/confirm/page.tsx` (new), `src/app/api/chat/join/route.ts`,
  `src/app/api/livekit-token/route.ts`, `src/lib/github.ts`.
- 2: `src/lib/safe-path.ts` (new), `src/app/login/page.tsx`, `src/lib/auth-email.ts`, `src/lib/login-identity.ts`,
  `src/lib/github.ts`.
- 3: `src/lib/github.ts`, `src/lib/repo-access.ts`, `src/lib/livekit-token.ts`, `src/app/api/livekit-token/route.ts`,
  `src/app/api/chat/join/route.ts`, `src/lib/github-types.ts`.
- 4: `next.config.ts`.
- 5: `src/app/api/bot/route.ts`, `src/app/api/bot/apply/route.ts`, `src/lib/bot.ts`, `src/lib/bot-tools.ts`,
  `src/lib/repo-snapshot.ts`, `src/lib/github.ts`, `.env.example`, `scripts/check-env.mjs`, README (env table).
- 6: `supabase/chat-hardening.sql` (new), `src/lib/chat.ts`, `src/app/chat/page.tsx`.
- Tests: `tests/desktop-handoff.test.mjs`, `login-identity.test.mjs`, `livekit-token.test.mjs`,
  `repo-members.test.mjs`, `chat-access.test.mjs`, `bot.test.mjs`, `bot-route.test.mjs`, new `safe-path.test.mjs`.
- Notes: LIB `github-api`, `chat`, `calls`, `file-bot`, `desktop-app`, `deploy`; README; GOTCHAS (CSP + Tauri IPC).

## Risks / needs OK
- **Public repo chats and calls close to readers** (item 3): people who only read a public repo lose access to its
  chat and call. That's the point, but it changes what users see.
- **Bot server key** (item 5) stops working for anyone not in `BOT_ALLOWED_LOGINS`. Pattadon sets it in Vercel
  Production **before** that PR merges, or the team's own Assistant falls back to "add your own key".
- **CSP** with `'unsafe-inline'` for scripts is a first step, not full XSS protection: Next.js needs per-request
  nonces for a strict policy, which makes every page dynamic. Nonces are a follow-up.
- **Desktop:** the new flow needs a real test in the installed app on macOS and Windows (Kin or proud). Old installed
  apps keep working, because the web page starts the sign-in.
- Touches areas others own: bot (proud), desktop and calls (Kin), chat SQL (Pattadon), chat UI and login page (Trin).
  Suggest one PR per item (6 PRs) so each owner reviews theirs; every merge to `main` deploys.
- Several chats share this folder: work on a new branch `trin/security-fixes` (or one branch per PR), stage only
  these files, ask before commit/push.

## Not in this plan (follow-ups)
- Desktop local git hardening (M9: Rust-side allowed folders, `-c core.fsmonitor=false`, `--no-ext-diff`), the Drive
  SVG preview (M10), installer signing and checksums (M11), the deploy workflow branch check (M12), and a
  "this repo is public" warning on Drive/Tasks/Context (M13): a part 2 plan.
- Chat keyed by GitHub repo id (rename safety), server-posted git events, strict CSP with nonces, private Realtime
  presence channels, the remaining low findings.

## How we'll verify
- `npm run typecheck`, `npm test` (new and updated tests, below), `npm run build`.
- Unit tests: safe-path (`/\evil.com`, `/%09/evil.com`, `/\t/x`, `//x`, `https://x` → fallback; `/repo?x=1#y` kept);
  ticket without challenge refused, wrong verifier refused, expired refused, GET finish sets no cookie; room from id,
  and the old collision pairs (`acme/my-app` vs `acme-my/app`) now differ; public repo + read only → not a member;
  bot: unlisted login on the server key → 403, `custom` refused, apply signed out → 401 before any glob runs, a
  pathological pattern finishes fast; snapshot over the cap → clear error.
- Local browser (fake GitHub + local Supabase off): login returnTo, Report-Only CSP with no violations on every page.
- Live, with the team's OK, after each merge: response headers; `/auth/desktop/finish?ticket=<old>` in a normal browser
  does not sign in; desktop sign-in on macOS and Windows; a call between two members; a non-collaborator gets "not a
  member" on a public repo; in Supabase, an insert with a future `created_at` is saved with `now()`.
