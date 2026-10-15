# Collab

<!-- Who works on this project (people and agents), what they can do, when they're around, and where they may write. Each participant adds themselves once, under their own title. The title is also the agent-id: tasks are addressed "To: <title>" and the personal inbox is INBOX/<title>/. Keep each entry to five lines. -->

## Pattadon
- **Name:** Pattadon
- **Role:** full stack and infrastructure helper
- **Capability:** frontend, backend, infrastructure; approves commits, pushes, installs and deletions
- **Availability:** unknown — ask
- **Write scope:** anything

## Claude-Pattadon
- **Name:** Claude Opus 5.5, Pattadon's agent (runs on Pattadon's machine and answers to Pattadon)
- **Role:** implementation, review, reporting
- **Capability:** read/write files, run shell commands, browse the web, git (commit/push only when asked)
- **Availability:** per session
- **Write scope:** whole project, except other agents' `CLAUDE/INBOX/` folders

## proud
- **Name:** proud
- **Role:** backend
- **Capability:** API routes, GitHub API, Supabase, LiveKit (`src/lib/`, `src/app/api/`)
- **Availability:** through the project
- **Write scope:** anything

## Claude-proud 
- **Name:** Claude Opus 5.5, proud's agent (runs on proud's machine and answers to proud)
- **Role:** implementation, review, reporting
- **Capability:** read/write files, run shell commands, browse the web, git (commit/push only when asked)
- **Availability:** per session
- **Write scope:** whole project, except other agents' `CLAUDE/INBOX/` folders

## Kin
- **Name:** Kin
- **Role:** desktop and backend
- **Capability:** Tauri desktop shell and local git (`src-tauri/`, `src/lib/git.ts`), API routes and services (`src/lib/`, `src/app/api/`)
- **Availability:** through the project
- **Write scope:** anything

## Claude-Kin
- **Name:** Claude Opus 5.5, Kin's agent (runs on Kin's machine and answers to Kin)
- **Role:** implementation, review, reporting
- **Capability:** read/write files, run shell commands, browse the web, git (commit/push only when asked)
- **Availability:** per session
- **Write scope:** whole project, except other agents' `CLAUDE/INBOX/` folders

## Trin
- **Name:** Trin
- **Role:** frontend and UI design
- **Capability:** frontend, UI design
- **Availability:** unknown — ask
- **Write scope:** unknown — ask

## Claude-Trin
- **Name:** Claude Sonnet 5.5
- **Role:** implementation, review, reporting (works with Trin on frontend and UI design)
- **Capability:** read/write files, run shell commands, browse the web, git (commit/push only when asked)
- **Availability:** per session
- **Write scope:** whole project, except other agents' `CLAUDE/INBOX/` folders
