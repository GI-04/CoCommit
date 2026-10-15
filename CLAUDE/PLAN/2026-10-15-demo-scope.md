# Plan: Hackathon demo scope (24 hours)

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **Superseded by:** —

## Why
The hackathon runs 24 hours: **2026-10-15 11:30 → 2026-10-16 11:30**. We need a small, fixed scope so three people and their agents can build in parallel without stepping on each other.

## In the demo (must work live)
1. **Git buttons**: sign in with GitHub → pick a repo → see a file's changes → write a message → **Commit** → open a **pull request**. Everything goes through the GitHub API, so web, macOS and Windows behave the same.
2. **Chat**: one real-time channel per project (Supabase Realtime). It shows who's online, and git events (commits, PRs) can be posted into it automatically.
3. **Agentic AI context sharing**: each project has one shared context file in the repo, `COCOMMIT.md` (the app's own version of our `CLAUDE/HANDOFF.md`). It holds the current state, who works on what, decisions and next step. The app shows it, lets people edit it with buttons, and auto-adds recent commits and pinned chat messages. Every teammate's AI agent (Claude, Codex, …) reads the same file from the repo, so they all start with the same context.
   - Confirmed by Pattadon 2026-10-15.

## Platforms
- **Web**: deployed on Vercel.
- **macOS + Windows**: a Tauri app whose window loads the deployed web URL. This avoids the static-export / API-route problem (see GOTCHAS) and means one codebase with no extra desktop code. Each OS must be built on that OS (a Mac for `.dmg`, a Windows PC for `.msi`).
- **Phone**: out of scope for the demo.

## Out of scope (mock screen or "coming soon" at most)
Calls, file sharing, task board, local git in the desktop app, phone install.

## Who does what (by COLLAB roles)
| Who | Owns | Files |
|---|---|---|
| Pattadon + Claude-Pattadon | Accounts and keys (GitHub OAuth app, Supabase, Vercel); app layout and all screens; AI context feature | `src/app/` pages, `src/components/`, context UI |
| Proud (tiramisucake0127) | GitHub sign-in and the git-button API (repos, diff, commit, PR); read/write `COCOMMIT.md` through the API | `src/lib/github.ts`, `src/app/api/github/` |
| Kin | Chat backend (Supabase tables + Realtime) and the Tauri desktop app; builds the Windows `.msi` (Pattadon builds the macOS `.dmg`) | `src/lib/supabase.ts`, `src-tauri/` |

Different files per person mean fewer merge conflicts. Everyone works on their own branch and merges by PR.

## Timeline
| When | Milestone |
|---|---|
| 11:30–13:30 | Scope agreed, accounts and keys set up, layout + empty pages running, board tasks out |
| 13:30–21:30 | Build the three features separately, with fake data where another part isn't ready |
| 21:30–03:30 | Connect everything end to end, deploy to Vercel, first desktop builds |
| 03:30–09:30 | Bug fixing, polish, demo repo with sample data |
| 09:30–11:30 | Freeze code (no new features), record demo video, write submission |

## Risks / needs OK
- Setting up accounts (GitHub OAuth app, Supabase, Vercel) and installing packages (`@octokit/rest`, `@supabase/supabase-js`) need Pattadon's OK.
- Windows build: Kin has the Windows PC and builds the `.msi`; Pattadon's Mac builds the `.dmg`.
- Desktop app needs internet (it loads the web URL). That's fine for the demo; say so in the pitch.

## How we'll verify
- Demo script runs end to end on web, macOS and Windows: sign in → commit → PR → event appears in chat → context file updates → a second teammate's agent reads it.
