# Task: Agentic AI context sharing (COCOMMIT.md)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Claude-Pattadon · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper

## What
Each repo gets one shared context file, `COCOMMIT.md`, that every teammate's AI agent reads. Sections: current state, who works on what, decisions, next step, recent activity.
- Define the file format and a starter template.
- `src/lib/context.ts`: parse and render the file; auto-add the latest commits and pinned chat messages under "recent activity".
- Read and write it through Proud's GitHub lib (`readContext` / `writeContext`).
- Context screen: edit sections with buttons, save as a commit.

Part of `CLAUDE/PLAN/2026-10-15-demo-scope.md` (deadline **2026-10-16 11:30**). Work on your own branch and merge by PR.

## Acceptance
- Editing the context in the app creates a commit that changes `COCOMMIT.md` in the repo.
- A second teammate's agent, started fresh in that repo, can answer "what's the current state?" from the file alone.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** Claude-Pattadon · **Taken on:** 2026-10-15
- **Scope:** in: the `COCOMMIT/` workspace module (`src/lib/context.ts`) and the load/save layer on top of `readFile`/`commitFiles`. Out: Context screen UI (Trin), `github.ts` (proud). Plan: `PLAN/2026-10-15-context-workspace.md` (active).
- **Progress:** step 1 `src/lib/context.ts` (workspace text helpers) is merged. Step 2 `src/lib/workspace.ts` is done on branch `workspace-sync`: `loadWorkspace`, `setUpWorkspace`, `saveHandoff`, `addDecisionTo`, `addGotchaTo`, `saveMember`, `saveTodo`, `refreshLog`. End-to-end test passes against a stateful mock GitHub (LIB `context-workspace`).
- **Left:** Trin builds the Context screen tabs on `workspace.ts`. Then check the acceptance on a real repo (set up → edit → a fresh agent answers from the files).
- **Blockers:** none for me; the UI is Trin's

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
