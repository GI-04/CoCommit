---
name: wrap-up
description: End-of-loop wrap-up for this project — refreshes the LIB entries touched, verifies the work, writes the deliverable to CLAUDE/OUTPUT/, updates HANDOFF/TODO/LOG/GOTCHAS/DECISIONS, and moves the BOARD task (Done, stays Taken, or released to Pending with a handoff). Use when the user types /wrap-up, says "wrap up", "we're done", "end the session", or when a task in this project is finished.
---

# Wrap-up

1. **Gather facts** (don't guess): run `git status -sb` and `git diff --stat` if this is a git repo; recall what was done, what was verified and how.
2. **Refresh LIB:** for every subject your work touched, update its summary in `CLAUDE/LIB/knowledge/<type>/`, its source references, and its entry in `CLAUDE/LIB/pointers/<type>.json` (`{"id","title","kind","tags","summary","path","sources","added"}`, paths relative to `CLAUDE/LIB/`). New durable subject → pick the pointer whose `about` fits, or create a new pointer from `CLAUDE/LIB/_POINTER_TEMPLATE.json` (prefer reusing a type); write the note from `CLAUDE/LIB/_TEMPLATE.md`; store raw material under `CLAUDE/LIB/sources/<type>/`. Fix or remove entries your work proved wrong. Skip if nothing qualifies. Failures go in step 4, not here.
3. **Gate — LIB current and work verified?** Yes only if step 2 is complete and the task's Acceptance was actually checked (test, command, or inspection), not assumed.
4. **Project memory** (always, whatever the gate says):
   - `CLAUDE/LOG.md`: one line per meaningful event this loop (newest on top).
   - `CLAUDE/GOTCHAS.md`: any failure worth not repeating, with evidence and workaround.
   - `CLAUDE/DECISIONS.md`: any real choice; if it replaces an older one, mark the old one `superseded`.
   - `CLAUDE/TODO.md`: add new backlog items and open questions; tick or prune finished ones.
   - `CLAUDE/HANDOFF.md`: rewrite with the real current state and the exact next step.
5. **Plans:** if this loop implemented a file in `CLAUDE/PLAN/`, set its status (`active`, `done`, or `superseded`). Never delete.
6. **Board** — open only the task file you took (never list or read the rest of `CLAUDE/BOARD/Taken/`):
   - **Gate yes:** write the deliverable and its verification to `CLAUDE/OUTPUT/YYYY-MM-DD-HHMM-<slug>.md` (use `CLAUDE/OUTPUT/_TEMPLATE.md`, real date/time), fill the task's Done section (link the deliverable), move it to `Done/`.
   - **Gate no, can continue later:** leave it in `Taken/`; update Progress and Blockers.
   - **Can't continue (blocked, out of scope, or someone else should):** fill the Handoff section, move it back to `Pending/` (unclaimed).
   - Follow-up work for someone else → new task in `Pending/` addressed to the right Title in `CLAUDE/COLLAB.md`, with an `Under:` line.
7. **Reply** with a 3–5 line summary: gate result, task state, link to the deliverable, the exact next step, and whether there's uncommitted work (with the git command to commit it, explained in plain words; don't run it unless asked).
