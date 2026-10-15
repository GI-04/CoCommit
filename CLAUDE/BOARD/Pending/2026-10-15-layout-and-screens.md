# Task: App layout and screens: Repo, Chat, Context

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Trin (not yet in COLLAB.md: add yourself first) · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
Fill the empty `src/app/layout.tsx`, `page.tsx`, `globals.css` and `src/components/`. Build three screens with fake data first, then wire them to the real libs when they land:
- **Repo** (`src/app/repo/`): repo picker, changed files, commit message box, Commit and Open PR buttons
- **Chat** (`src/app/chat/`): message list, input, online list, git events shown inline
- **Context** (`src/app/context/`): shows and edits `COCOMMIT.md`
Hide or mark "coming soon": calls, files, tasks.
- Context screen: now a **team workspace** (see `PLAN/2026-10-15-context-workspace.md`). Make tabs for Handoff, Team, Decisions, Gotchas, Log and Todo, plus a "Set up team context" button, all using `src/lib/context.ts` (`setupWorkspace`, `parseHandoff`/`renderHandoff`, `parseCollab`/`upsertMember`, `addDecision`, `addGotcha`, `parseTodo`/`renderTodo`, `addActivity`). Chat gets "Pin as decision / gotcha" buttons.

Part of `CLAUDE/PLAN/2026-10-15-demo-scope.md` (deadline **2026-10-16 11:30**). Work on your own branch and merge by PR.

## Acceptance
- `npm run dev` and `npm run typecheck` pass.
- All three screens work at desktop width and in the Tauri window.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** — (released by Claude-Pattadon 2026-10-15) · **Taken on:** —
- **Scope:** in: layout, nav, home, Repo/Chat/Context screens with fake data (`src/lib/mock.ts`), coming-soon pages. Out: `src/lib/github.ts`, `supabase.ts`, `context.ts` logic, `src-tauri/` (other tasks).
- **Progress:** see Handoff
- **Blockers:** none

## Handoff <!-- filled only when released back to Pending/ -->
Pattadon reassigned the frontend to Trin. Claude-Pattadon's partial work is merged into `main`; `npm run typecheck` passes, but it has not been opened in a browser yet.
- **Done:** theme colors (light/dark) in `globals.css`; `layout.tsx` with a sidebar `Nav` (Repo, Chat, Context, plus a coming-soon group); home page; shared UI in `src/components/ui.tsx`; Repo, Chat and Context screens running on fake data from `src/lib/mock.ts`; coming-soon pages for tasks, files and calls; `moduleDetection: "force"` in `tsconfig.json` so empty placeholder files don't break the typecheck.
- **Left:** check it in the browser and in the Tauri window; polish; swap `mock.ts` for the real `github.ts` and `supabase.ts` when Proud's and Kin's work lands. Keep their function names (listed in their board tasks).
- **Exact next step:** `git pull` on `main` (make your own branch for further work), `npm install`, `npm run dev`, open http://localhost:3000 and click through all three screens.
- `src/components/Placeholder.tsx` is empty and unused; it can be deleted.

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
