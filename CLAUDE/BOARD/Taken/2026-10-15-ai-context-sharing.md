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
- **Scope:** in: file format, template, `src/lib/context.ts` (parse, render, edit, recent activity, agent pointer). Out: the Context screen UI (Trin's frontend task) and `github.ts` (Proud).
- **Progress:** `src/lib/context.ts` done on branch `ai-context-sharing`: `template`, `parseContext`, `renderContext`, `getSection`, `updateSection`, `addRecentActivity` (newest first, no duplicates, max 15), `AGENT_POINTER` / `withAgentPointer` (one line for a repo's CLAUDE.md/AGENTS.md so agents find COCOMMIT.md). Node test script passes; typecheck passes.
- **Left:** save through Proud's `readContext` / `writeContext`; Trin swaps the Context screen's inline parser for this module.
- **Blockers:** waiting on `readContext` / `writeContext` in `src/lib/github.ts` (Proud)

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** — · **Verified by:** —
- **Result:** —
