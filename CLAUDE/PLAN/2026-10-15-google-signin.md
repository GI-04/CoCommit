# Plan: Google sign-in (app login) with Supabase Auth

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **By:** Claude-Pattadon · **Task:** none yet · **Superseded by:** —

## Why
Nothing in the app knows who the user is. Chat ("who's online"), tasks and file sharing all need a signed-in identity. Google sign-in gives that identity with Supabase Auth (already in the approved stack). GitHub sign-in stays separate: it's the *git permission* (Proud's `PLAN/2026-10-15-github-api.md`), not the app login.

## What's missing today (audit)
| # | Gap | Where |
|---|-----|-------|
| 1 | No Supabase client: `src/lib/supabase.ts` is empty | Kin's file |
| 2 | No sign-in page / Google button | `src/app/login/` |
| 3 | No OAuth return route to turn Google's `code` into a session | `src/app/auth/callback/route.ts` |
| 4 | No session refresh or route protection. Next 16 calls this `src/proxy.ts` (was `middleware.ts`) | new |
| 5 | No sign-out, and no user name/avatar in `Nav` | `src/components/Nav.tsx` |
| 6 | Screens use a fake user (`me = "Pattadon"` in `mock.ts`) | `src/lib/mock.ts` |
| 7 | No `profiles` table, so chat/tasks have nothing to join to (name, avatar) | Supabase SQL |
| 8 | `@supabase/supabase-js` and `@supabase/ssr` not installed | `package.json` |
| 9 | Google Cloud OAuth client + Supabase Google provider not set up; redirect URLs for localhost, Vercel, and the Tauri app not registered | Pattadon's accounts-and-keys task |
| 10 | `.env.example` has the Supabase URL/anon key but nothing says Google is configured in the Supabase dashboard (no secret needed in our code) | docs |
| 11 | Tauri desktop loads the deployed URL, so the redirect must be the Vercel domain; a custom scheme isn't needed for the demo | decision |
| 12 | Two logins in one flow (Google for app, GitHub for git) not explained to the user on screen | UX |
| 13 | No demo fallback: before keys exist, login must not block the other screens | design |

## Choices
1. **Supabase Auth, Google provider, PKCE flow** with cookie sessions via `@supabase/ssr` (needs install OK).
2. Files: `src/lib/supabase.ts` (browser client), `src/lib/supabase-server.ts` (server client), `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/auth/signout/route.ts`, `src/proxy.ts`, small user chip in `Nav`.
3. **Demo mode:** if `NEXT_PUBLIC_SUPABASE_URL` is empty, the proxy lets everything through and the login page says "keys not set". The app keeps working like today.
4. `profiles` SQL (id → auth.users, name, avatar_url) with a trigger and RLS; given as a `.sql` file for Pattadon to run, not run by me.
5. Public routes: `/login`, `/auth/*`, static assets. Everything else needs a session once keys exist.

## Needs your OK
- `npm install @supabase/supabase-js @supabase/ssr`
- Touching Kin's `src/lib/supabase.ts` (client only; chat tables stay Kin's) and Trin's `Nav.tsx` (user chip only). Alternative: I make new files and they wire them.
- Pattadon does the dashboard steps (Google Cloud OAuth client, Supabase provider, redirect URLs) from a short checklist I'll write.

## Verify
- `npm run typecheck` clean.
- Demo mode: all screens load with empty env.
- With keys: Google button → Google → back to `/` signed in; refresh keeps session; sign-out returns to `/login`; protected route redirects when signed out.
