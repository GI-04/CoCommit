# Accounts and keys: setup guide (Pattadon)

For board task `2026-10-15-accounts-and-keys.md`. About 30–40 minutes. Only Pattadon can do this (it means signing in and creating accounts). Agents must never create accounts or paste keys.

**Never put a key in git, a commit, a board task or the group chat.** Keys go only in `.env.local` (git-ignored) and in Vercel's settings. Send them to teammates one-to-one, ideally with a password manager's share feature.

## What we need, and who uses it

| Variable | From | Used by |
|---|---|---|
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth app | Proud's sign-in and git buttons (`src/lib/github.ts`) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project | Chat (Kin), Google sign-in (Proud) |
| Vercel URL (not a key) | Vercel project | Desktop app window (`src-tauri/tauri.conf.json`), OAuth callback URLs |

LiveKit keys are **not needed**: calls are out of the demo.

Until a variable is set, that part runs in **fake mode** with made-up data, so nobody is fully blocked.

## Decide first: one sign-in or two?
Proud's branch has **two** sign-ins:
- GitHub, needed for the git buttons
- Google through Supabase

As soon as the Supabase keys are set, `src/proxy.ts` sends everyone to `/login` for **Google** first. That means extra setup in Google Cloud (step 3b) and two logins in the demo.

**Recommendation:** use GitHub sign-in only for the demo. Ask Proud to make `proxy.ts` skip the Google login, and skip step 3b.

## 1. Vercel: get the public URL
The repo `GI-04/CoCommit` is **private and owned by an organization**. As far as I know, Vercel's free Hobby plan won't deploy a private org repo straight from GitHub. Pick one of these:
- **A (simplest):** deploy from your laptop with the Vercel CLI. That works on Hobby. It needs `npm i -g vercel` (installing, so OK it yourself), then `vercel login` and `vercel --prod` in the project folder.
- **B:** start a Vercel Pro trial and import `GI-04/CoCommit` at vercel.com/new.
- **C:** make the repo public, then import it on Hobby.

Write down the URL (e.g. `https://cocommit-xyz.vercel.app`) and add it to `CLAUDE/HANDOFF.md`.

## 2. GitHub OAuth apps (two of them)
A GitHub OAuth app allows only **one** callback URL, so make one app for local development and one for the deployed site.

GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**. Create it under the **GI-04** org if you can, so the team owns it.

| Field | Dev app | Prod app |
|---|---|---|
| Application name | CoCommit (dev) | CoCommit |
| Homepage URL | `http://localhost:3000` | your Vercel URL |
| Authorization callback URL | `http://localhost:3000/api/github/callback` | `<Vercel URL>/api/github/callback` |

After creating each app, copy the **Client ID**, then **Generate a new client secret** and copy it straight away (GitHub shows it only once).
- **Dev app** → everyone's `.env.local`
- **Prod app** → Vercel's environment variables

## 3. Supabase
1. supabase.com → **New project**. Region: Singapore (closest). Save the database password in your password manager.
2. Project Settings → API: copy the **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`) and the **anon public** key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). The anon key is meant to be public; the `service_role` key is not, so never share that one.
3. SQL editor: run `supabase/profiles.sql` (from Proud's branch). Run Kin's chat schema when it lands.
4. Authentication → URL Configuration:
   - Site URL: your Vercel URL
   - Redirect URLs: `http://localhost:3000/auth/callback` and `<Vercel URL>/auth/callback`
5. (3b, only if you keep Google sign-in) follow `CLAUDE/OUTPUT/google-signin-setup.md` from Proud's branch.

## 4. Put the values in place
- **Your machine:** copy `.env.example` to `.env.local` and fill in the dev GitHub app plus Supabase. Then run `node scripts/check-env.mjs`.
- **Vercel:** Project → Settings → Environment Variables. Add the prod GitHub app plus Supabase, then redeploy.
- **Teammates:** send each person the dev values one-to-one, and have them run the checker.
- **Kin:** send the Vercel URL so the desktop app opens it instead of `http://localhost:3000` (`frontendDist` in `src-tauri/tauri.conf.json` on `kin/desktop-builds`).

## 5. Done when
- `node scripts/check-env.mjs` shows all required values set, on every teammate's machine.
- The Vercel URL opens CoCommit, and GitHub sign-in there brings you back signed in.
- The Vercel URL is in `CLAUDE/HANDOFF.md`, and Kin has it.
