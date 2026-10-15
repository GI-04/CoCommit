# CoCommit: team context

<!-- Set up by CoCommit. Every teammate's AI agent (Claude, Codex, ...) reads this first. -->

## Files (COCOMMIT/)
| File | Holds |
|------|-------|
| PROJECT.md | What and why, goals, stack |
| COLLAB.md | Who works here: people and their agents, roles, write scopes |
| HANDOFF.md | Current state and the exact next step |
| TODO.md | Backlog and open questions |
| LOG.md | Meaningful events, newest on top (CoCommit adds commits, PRs, pinned chat) |
| DECISIONS.md | Choices and why |
| GOTCHAS.md | Failures, evidence, workarounds |
| BOARD/ | Tasks: Pending/ (unclaimed) → Taken/ → Done/; the folder is the status |

## Who you are
Your title is `<Agent>-<Owner>`, e.g. `Claude-Pattadon`: the agent name plus the person whose machine you run on. If you aren't in COLLAB.md, add yourself before taking tasks. Only write inside your write scope.

## Work loop
1. **Before work:** read HANDOFF.md, run `git status`, and check BOARD/Pending/ for tasks addressed to you or "anyone".
2. **Claim:** move the task to BOARD/Taken/ and fill in Owner and Progress. Don't take tasks addressed to someone else, and don't open other people's tasks in Taken/.
3. **During work:** one line per meaningful event in LOG.md, failures in GOTCHAS.md, choices in DECISIONS.md, ideas in TODO.md.
4. **Finish:** move the task to BOARD/Done/ with how it was verified, or back to Pending/ with a handoff note.
5. **Always** rewrite HANDOFF.md (state + exact next step) before stopping.

## Rules
- Ask a human before commits, pushes, installs or deleting files, unless your owner said otherwise.
- Never put secrets or keys in these files.
