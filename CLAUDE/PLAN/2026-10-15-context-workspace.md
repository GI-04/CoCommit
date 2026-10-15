# Plan: AI context as a team workspace (like /initiate-team)

**Status:** active <!-- proposed | active | done | rejected | superseded -->
**Date:** 2026-10-15 · **Superseded by:** —

## Why
Right now the shared context is one `COCOMMIT.md` file with five sections. Pattadon wants it arranged like the `/initiate-team` skill, which we already use here in `CLAUDE/`: each kind of memory gets its own file, there is a task board, and every agent knows its role. That's a much stronger pitch: "CoCommit sets up your repo so every teammate's AI agent works like one team".

## What a repo gets (created by a "Set up team context" button)
```
<repo>/
  CLAUDE.md, AGENTS.md      ← one pointer line each: read COCOMMIT/CONTEXT.md first
  COCOMMIT/
    CONTEXT.md              ← shared agent instructions: work loop, board rules, index of the files below
    PROJECT.md              ← what & why, stack, goals (from a short form in the app)
    COLLAB.md               ← team members and their agents: <Agent>-<Owner>, role, write scope
    HANDOFF.md              ← current state + exact next step
    TODO.md                 ← backlog + open questions
    LOG.md                  ← meaningful events (app auto-adds commits, merged PRs, pinned chat)
    DECISIONS.md            ← choices + why ("Pin as decision" in chat)
    GOTCHAS.md              ← failures + workarounds ("Pin as gotcha" in chat)
    BOARD/Pending|Taken|Done/  ← tasks; the folder is the status   (stretch)
```
Left out for the hackathon: LIB/, PLAN/, OUTPUT/ and INBOX/ (chat replaces INBOX).

## How the app uses it
| Workspace file | In the app |
|---|---|
| CONTEXT.md, PROJECT.md | Written once by the setup button from a short form |
| COLLAB.md | Context screen "Team" tab; prefilled from repo collaborators |
| HANDOFF.md, TODO.md | Edited with buttons on the Context screen |
| LOG.md | Auto: new commits, merged PRs, pinned chat messages |
| DECISIONS.md, GOTCHAS.md | "Pin as decision / gotcha" on a chat message |
| BOARD/ | Tasks screen (stretch, if time allows) |

Each save is one commit through Proud's `commitFiles` (several files at once). Reads go through `readFile`. The single-file `readContext`/`writeContext` is no longer needed.

## Approach
1. `src/lib/context.ts` becomes a workspace module: templates for each file, `setupWorkspace(form)` returning the files to commit, parse/update helpers per file (handoff, log entry, decision, gotcha, collab member), and the pointer lines for CLAUDE.md/AGENTS.md. Pure functions, tested with a Node script like before. (Claude-Pattadon)
2. A small API layer: `loadWorkspace(repo)` and `saveWorkspace(repo, changes, message)`, built on `readFile`/`commitFiles`. Built after Proud's PR merges. (Claude-Pattadon)
3. Context screen: tabs for Handoff, Team, Decisions, Gotchas, Log, Todo, plus the setup button. (Trin, using the module)
4. Chat "Pin as decision / gotcha" buttons. (Trin + proud)
5. Stretch: BOARD/ on the Tasks screen.

## Files touched
- `src/lib/context.ts`: rewrite (mine).
- `CLAUDE/BOARD/Pending/…`: update the layout-and-screens task for Trin; note for proud that `readContext`/`writeContext` can stay but won't be used.
- `CLAUDE/DECISIONS.md`: new entry; the one-file COCOMMIT.md design is superseded.
- `PLAN/2026-10-15-demo-scope.md`: line 3 of "In the demo" points here.

## Risks / needs OK
- Time: about 21 hours are left. Steps 1–2 take me about 2 hours. Steps 3–4 add work for Trin.
- Demo repos need the setup button run once (it commits ~10 files).
- More files means more git writes per save. Batching through `commitFiles` keeps it to one commit.

## How we'll verify
- Node test script: setup produces all files with no `{{placeholders}}`; each update helper round-trips.
- End to end after Proud's PR: press setup on a demo repo, and the files appear on GitHub in one commit. Then a fresh Claude session in that repo answers "what's the current state and who owns what?" from the files alone.
