# Project reading: CoCommit

**Date:** 2026-10-15 · **By:** Codex-Pattadon · **Result:** reading complete within the scope below
**Plan:** none (inspection only) · **Task:** direct user request; no implementation tasks claimed

## Coverage
Inspected current checkout at `24137f0` on `main`. Inventory excluding other agents' `BOARD/Taken/`: 141 tracked files, 123 text files (12,293 lines including lockfiles) and 18 binary icon assets, before this report.

- Read application source, route handlers, components, styles, SQL, build/deploy configuration, scripts, manifests, instructions, plans, Pending/Done board files and prior deliverables.
- Followed all four LIB pointer entries into summaries and their referenced mock servers, local git bridge and workspace end-to-end fixture.
- Parsed the npm lockfile (125 package entries) and inspected Cargo lock metadata (408 packages, 407 checksums). These were dependency inventories, not a line-by-line review of third-party implementations.
- Inspected icon formats/dimensions and viewed the source icon: white C on a blue rounded square.
- Checked local environment variable presence without exposing values; inspected local Vercel metadata field names and generated Next type references.
- Read installed Next.js Route Handler and Proxy introductory guides. Installed lockfile versions include Next 16.4.1, React 19.3.1, TypeScript 5.9.3, Tailwind 4.3.3 and Tauri 2.12.4.

Excluded: other agents' Taken tasks and inboxes, raw secret values, Git object storage, dependency implementation trees, build caches, OS metadata and historical versions of every file. This is a reading of the current project, not literally every byte on disk.

## Architecture and current implementation
| Area | Current implementation |
|---|---|
| Web | Next App Router, React client screens, Tailwind light/dark theme; shared sidebar and UI primitives |
| GitHub | Browser wrapper → JSON action route → server REST calls; OAuth state check and encrypted HTTP-only token cookie; repos, branches, diff, text editing, commits and PRs |
| Chat | Supabase anonymous or existing session, history, realtime inserts/pins, presence; browser storage/BroadcastChannel fallback |
| Context | Pure Markdown helpers plus GitHub-backed workspace services; UI still uses old mock single-file design |
| Desktop | Tauri loads deployed web URL; macOS universal DMG workflow; local git UI exists but Rust implementation is absent |
| Login | GitHub and Google UI; email/password and permission helpers exist but have no email/reset screen wiring |
| Deferred features | Tasks/files/calls are Coming Soon; LiveKit token route returns 501; manifest icons are empty |

## Important integration boundaries
1. Context edits currently change React state only. Connect the existing workspace service rather than implementing it again.
2. Chat uses the fixed `GI-04/CoCommit` repo from mocks; Repo selection does not select the chat channel. Git events for another repo therefore do not appear in the displayed channel.
3. GitHub and Supabase identities remain separate. SQL checks `author_id`, but the displayed `author` is supplied by the browser; reads/pins are not scoped to repo membership.
4. Desktop commands required by `local-git.ts`, the Rust dialog plugin and remote IPC grants are missing. The Node bridge is a development fixture, not the shipped desktop backend.
5. Email helpers and combined sign-out exist, but the current sidebar still signs out by provider. `permissions.ts` is not wired into the screens.
6. Built-in GitHub fake mode persists legacy `COCOMMIT.md` only. Workspace testing uses a separate stateful mock.
7. Documentation mixes earlier milestones with later implementations: workspace services and email helpers are already on main; local git was later added to scope; Google setup has a completed report. Live deployment state was not independently checked.

## Verification
- TypeScript check passed using the existing installed dependencies.
- Environment checker reported all four required GitHub/Supabase variables set. This does not validate credentials against services.
- CLAUDE/CLAUDE.md and CLAUDE/AGENTS.md are identical.
- Existing end-to-end fixtures were read, not rerun. No browser, production build, desktop build or live service test performed.

Repeat the typecheck (same command on both platforms):

```zsh
npm run typecheck
```

```powershell
npm run typecheck
```

## Changes and next step
Only project memory changed: registered Codex-Pattadon, refreshed handoff/log and four LIB summaries/pointer descriptions, and added this report. Created an empty ignored personal inbox. Application code is unchanged; nothing was committed or pushed.

Reading request complete. For the existing demo plan, the next frontend step is wiring the Context screen to `workspace.ts`; coordinate with Trin's pending task before implementation.
