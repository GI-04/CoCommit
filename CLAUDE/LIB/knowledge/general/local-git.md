# Local git in the desktop app (`src/lib/local-git.ts`)

**Added:** 2026-10-15 · **Kind:** reference

## Takeaway
The Repo page has a **GitHub | Local folder** switch, shown only in the desktop app (`isDesktop()`). Local mode works on a clone on the user's computer through their own `git`. The browser calls 12 Tauri commands (`git_status`, `git_stage`, …; contract in `BOARD/…/2026-10-15-local-git-rust.md`). Each returns git's raw stdout, and the parsing happens in TypeScript (`src/lib/git-status.ts`, pure, no imports). The website never shows Local mode.

## Details
- **Current integration (2026-10-15, Claude-Kin):** the Rust side is **merged** (PR #11): `src-tauri/src/git.rs` (the 12 commands + guards), `tauri-plugin-dialog`, and `capabilities/remote.json` (only https://cocommit.vercel.app may call them; `localhost:3000` only in dev builds). Tested on Windows in `tauri dev` and the release app: all commands, guards, no-login push fails fast, folder picker → Local screen shows the repo. Installers built before PR #11 (anything older than the 2026-10-15 refresh of `public/downloads/`) lack the commands, so Local mode fails there: reinstall. Desktop details: `knowledge/general/desktop-app.md`.
- **Files:** `git-status.ts` (`parseStatus` for porcelain v2 `-z` output; `githubRepoFromRemote`), `local-git.ts` (`isDesktop`, `chooseRepoFolder`, `getStatus`, `getDiff`, `stage`, `unstage`, `discard`, `commit`, `pull`, `push`, `switchBranch`, `listLocalBranches`, `remoteRepo`; errors are `LocalGitError` with plain-language messages), `components/LocalRepo.tsx` (the screen).
- **Status shape:** `{ branch | null, upstream, ahead, behind, staged[], unstaged[], untracked[], conflicted[] }`. A file can be both staged and unstaged. Renames carry `origPath`.
- **Screen:** folder picker (the last one is remembered); branch → upstream with ↑ahead / ↓behind; Staged / Changes / Untracked lists with Stage, Unstage, Stage all and Discard (asks first); diff per file; commit box (only staged files); Pull (`--ff-only`); Push (`-u origin HEAD`), then an "Open a pull request" link to GitHub's compare page. Refreshes when the window gets focus.
- **Safety:** the Rust side must refuse paths outside the repo, names starting with `-`, `..` segments, and bad branch names. The live site can call these commands, so the list stays small.
- **Testing without the Rust side:** `sources/general/local-git-bridge.mjs` is a Node server on :4020 with the same 12 commands and guards, running real git. Run it with `node local-git-bridge.mjs`, then in the dev site's console `localStorage.cocommitGitBridge = "http://127.0.0.1:4020"` and reload. Local mode appears in a normal browser, and "Choose folder" asks for a path. This only works in dev builds (`NODE_ENV !== "production"`). It's also a reference for the Rust commands.

## Sources
- `sources/general/local-git-bridge.mjs`: test bridge and reference implementation (verified 2026-10-15: status, diff, stage, commit and push on a throwaway repo; guards refused `../x`, `-A`, relative repo, `--orphan`)
- `PLAN/2026-10-15-local-git.md`, `BOARD/…/2026-10-15-local-git-rust.md`
- git porcelain v2 format: https://git-scm.com/docs/git-status#_porcelain_format_version_2

**Last checked against sources:** 2026-10-15
