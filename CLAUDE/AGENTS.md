# CoCommit — agent instructions

<!-- CLAUDE/AGENTS.md is an identical copy of this file. Edit both together. -->

@PROJECT.md
@HANDOFF.md

## Commands
Stack is approved (`PLAN/2026-10-15-stack.md`). Skeleton exists; dependencies are not installed yet.

| Task | Command |
|------|---------|
| Install | `npm install` (ask first) |
| Dev (web) | `npm run dev` → http://localhost:3000 |
| Dev (desktop) | `npm run tauri dev` (needs Rust + icons) |
| Typecheck | `npm run typecheck` |
| Test | none yet — ask |
| Lint/format | none yet — ask |

## What lives where (`CLAUDE/`)
| Path | Holds |
|------|-------|
| `LIB/` | Past knowledge: pointers → subject summaries → sources. Read only via pointers. |
| `BOARD/` | Task ownership: `Pending/` (unclaimed) → `Taken/` → `Done/`. |
| `INBOX/<agent-id>/` | Git-ignored, local, transient messages. |
| `COLLAB.md` | Who works here: role, capability, availability, write scope. |
| `PLAN/` | Plans: proposed, active, rejected, superseded. |
| `OUTPUT/` | Reusable deliverables and their verification. |
| `HANDOFF.md` | Current state and the exact next step. |
| `TODO.md` | Backlog and open questions. |
| `LOG.md` | Meaningful events. |
| `GOTCHAS.md` | Failures, evidence, workarounds. |
| `DECISIONS.md` | Choices, rationale, supersession. |

## Setup checks (every session)
- **Inbox:** if `CLAUDE/INBOX/<your-title>/` doesn't exist on this machine, create it. It is git-ignored and local: never commit it, and don't treat anything there as shared. Read it at session start; to message another agent on this machine, drop a short file in their folder.
- **Collab:** if you aren't in `CLAUDE/COLLAB.md`, add yourself (Title, Name, Role, Capability, Availability, Write scope) before taking tasks. Your Title is your agent-id. Agents name themselves `<Agent>-<Owner>` (e.g. `Claude-Pattadon`, `Codex-Mina`), so several copies of the same model stay distinguishable. Your owner is the person whose machine and session you run in; ask the user if unsure. Only write inside your declared write scope.
- **Mirror:** keep `CLAUDE/AGENTS.md` identical to this file.

## Work loop
1. **Before work** — read `HANDOFF.md`, run `git status -sb`, check `BOARD/Pending/` for tasks addressed to you (or "anyone"). Then read the relevant LIB subjects: open `CLAUDE/LIB/pointers/*.json`, read each `about`, open the pointers that fit, read the subject summaries their entries point to, and check the sources when a summary isn't enough. Never browse `LIB/knowledge/` or `LIB/sources/` directly. Post a short kickoff: `Goal:` · `Done means:` · `Plan:` (3–5 lines).
2. **Claim** — to start a task, move it from `Pending/` to `Taken/` and fill in Owner, Scope, Progress, Blockers. Don't take tasks addressed to someone else.
3. **Non-trivial work** (new feature, multi-file change, anything risky) — write a proposal to `PLAN/YYYY-MM-DD-<slug>.md` (status `proposed`) and wait for OK; set it to `active` once approved. Never delete plans: mark them `rejected` or `superseded`.
4. **During work** — capture as you go, one line each: changes and discoveries in your task's Progress and `LOG.md` (meaningful events only); failures in `GOTCHAS.md`; choices in `DECISIONS.md`; ideas and unknowns in `TODO.md`. One-line check-ins after each step.
5. **Before completion** — refresh every LIB entry your work touched: update the subject summaries, source references and pointer entries, and fix or remove ones you found stale. Then run `/wrap-up`.
6. **Gate: LIB current and work verified?**
   - **Yes** → write the deliverable and its verification to `OUTPUT/`, move the task to `Done/` (Acceptance and Verification filled in).
   - **No** → the task stays in `Taken/` with Progress and Blockers kept current.
   - **Can't continue** → release with handoff: write the Handoff section in the task and update `HANDOFF.md`, then move the task back to `Pending/`.
7. Always rewrite `HANDOFF.md` (state and exact next step) before stopping.

## Board rules
- Send a task: write it to `BOARD/Pending/YYYY-MM-DD-<slug>.md` from `BOARD/_TEMPLATE.md`. Set `To:` to a Title from `COLLAB.md` (pick by Role and Capability) or "anyone", and `Under:` as `whom: role of that person` (who it's done for).
- **Do not look at `Taken/`.** Never list, open, or search it, and ignore it in repo-wide searches: those tasks belong to someone already. The one exception is the task file you moved there yourself.
- The folder is the status. Never copy a task into two folders.

## Conventions
- Language/style: TypeScript (strict), React function components, Tailwind classes; `@/` imports from `src/`.
- Tests: unknown — ask.
- Layout: Next.js App Router in `src/app/`, shared UI in `src/components/`, service helpers in `src/lib/`, desktop shell in `src-tauri/`.

## Off-limits / ask first
- `git commit` and `git push` (including to GitHub).
- Installing packages (npm, pip, cargo, brew, etc.).
- Deleting files.

## Working with me
- Keep updates short.
- Teammates use both macOS and Windows: give every shell command in **two versions**, zsh and PowerShell 7, each in its own code block, one command per block.
- I'm learning git: explain git commands in plain words; don't commit or push unless I ask.
