# Task: Local git commands in the desktop app (Rust side)

<!-- Filename: YYYY-MM-DD-<slug>.md. The folder is the status: Pending/ (unclaimed) → Taken/ (claimed) → Done/ (verified). Released work goes back Taken/ → Pending/ with a handoff note. -->

**To:** Kin · **From:** Claude-Pattadon · **Created:** 2026-10-15
**Under:** Pattadon: full stack and infrastructure helper (plan `PLAN/2026-10-15-local-git.md`, active)

## What
The Repo page gets a **Local** mode in the desktop app: pick a cloned repo folder, see staged / unstaged / untracked files, stage, commit, pull, push. Claude-Pattadon is building the web side (`src/lib/local-git.ts` + Repo page) **against the contract below at the same time**, so please keep the names and arguments exactly.

**Commands** (`#[tauri::command]` in `src-tauri/src/git.rs`, registered in `lib.rs`)
- Each runs the user's `git` with `std::process::Command`: fixed arguments, no shell.
- `cwd` = `repo`; env `GIT_TERMINAL_PROMPT=0` so push/pull never hang on a password prompt.
- Each returns `Result<String, String>`: `Ok(stdout)`, or `Err(stderr trimmed)` (or a clear message).
- Call from JS as `invoke("git_status", { repo })`, etc. Tauri maps snake_case Rust args to camelCase JS keys, and all arg names here are one word, so they match.

| Command | Args | Runs |
|---|---|---|
| `git_check` | `repo: String` | `git rev-parse --show-toplevel` (Ok = repo root) |
| `git_status` | `repo` | `git status --porcelain=v2 --branch -z --untracked-files=all` (raw output; JS parses it) |
| `git_remote_url` | `repo` | `git remote get-url origin` |
| `git_diff` | `repo, file: String, mode: String` | `staged` → `git diff --cached -- <file>`; `unstaged` → `git diff -- <file>`; `untracked` → `git diff --no-index -- /dev/null <file>` (exit code 1 = "has differences", treat as Ok) |
| `git_stage` | `repo, files: Vec<String>` | `git add -- <files…>` |
| `git_unstage` | `repo, files` | `git restore --staged -- <files…>` |
| `git_discard` | `repo, files` | `git restore -- <files…>` (the UI confirms first) |
| `git_commit` | `repo, message: String` | `git commit -m <message>` |
| `git_pull` | `repo` | `git pull --ff-only` |
| `git_push` | `repo` | `git push -u origin HEAD` |
| `git_branches` | `repo` | `git branch --format=%(refname:short)` |
| `git_switch` | `repo, branch: String, create: bool` | `git switch [-c] <branch>` |

**Guards** (important: the live site can call these)
- `repo` must be absolute, an existing directory, and pass `git_check`.
- Each `file` must be relative, not start with `-`, contain no `..` segment, and resolve inside `repo`.
- `branch` must pass `git check-ref-format --branch <branch>` and not start with `-`.
- `message` must be non-empty. No other commands, and no generic "run".

**Folder picker:** add `tauri-plugin-dialog` (Rust crate plus `.plugin(tauri_plugin_dialog::init())`). The web side calls it through `@tauri-apps/plugin-dialog` `open({ directory: true })`.

**Let the live site call them:** the window loads https://cocommit.vercel.app, so in `capabilities/default.json` add
```json
"remote": { "urls": ["https://cocommit.vercel.app/*", "http://localhost:3000/*"] }
```
and permissions for `dialog:allow-open` plus the 12 commands above. In Tauri 2, app commands may need an app manifest in `build.rs`: `tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[...]))`, then `allow-git-status` etc. in the capability. Check with `npm run tauri dev` that `window.__TAURI_INTERNALS__.invoke("git_check", { repo })` works from the loaded page.

**Web side is ready (Claude-Pattadon):** `src/lib/local-git.ts`, `git-status.ts` and `components/LocalRepo.tsx` call exactly these commands. A working **reference** with the same commands and guards in Node is in `CLAUDE/LIB/sources/general/local-git-bridge.mjs`; copy its argument lists and checks into Rust. Once your commands are in, the Repo page shows a **GitHub | Local folder** switch in the desktop app; test the whole flow there.

## Acceptance
- In `npm run tauri dev`, from the page's dev console: `git_check` on a clone returns its root; `git_status` returns porcelain v2 output; `git_stage` and `git_commit` work; a path outside the repo (`../x`) is refused.
- `git_push` / `git_pull` use the user's existing git login and don't hang without one; you get an error instead.
- Windows `.msi` build still works; macOS `.dmg` via the Actions workflow.

## Taken <!-- filled when claimed; keep current while it's in Taken/ -->
- **Owner:** Kin (with Claude-Kin) · **Taken on:** 2026-10-15
- **Scope:** `src-tauri/` only (git.rs, lib.rs, build.rs, capabilities, Cargo). Not the web side (Claude-Pattadon). Branch `kin/local-git-rust`.
- **Progress:** done on Windows. `src-tauri/src/git.rs` has the 12 commands and guards from the contract; `lib.rs` registers them and `tauri-plugin-dialog`; `build.rs` declares them (permissions `allow-git-*`); `capabilities/remote.json` allows only https://cocommit.vercel.app to use them plus `dialog:allow-open`. **Changes from the task:** `http://localhost:3000` is allowed in dev builds only (added at runtime in `lib.rs`), so in an installed app no other program on port 3000 can run git; env also sets `GCM_INTERACTIVE=never` (Git Credential Manager can't pop up a login window); git runs off the main thread and with no console window on Windows.
  Tested (Windows, `npm run tauri dev`, throwaway repo with a local bare remote, through the WebView2 debug port): all 12 commands work from the page (status is raw porcelain v2, `-z`; untracked diff via `/dev/null` works on Windows); pull fast-forwards; commit, push and push of a new branch reach the remote; diverged pull/push return git's error. Guards refuse: relative or missing repo, non-repo folder, `../x`, `C:\Windows\win.ini`, `--all`, empty list, empty message, `bad..name`, `-f`, a bad diff mode, and a non-listed command. Push to a missing GitHub repo fails in 2.7 s with "Repository not found" (no prompt, no hang). Release build: git works from https://cocommit.vercel.app and is refused from localhost:3000 ("not allowed by ACL"). `cargo test`: 3 guard tests pass. Release `.msi` and setup `.exe` build. Folder picker: Kin chose the test repo through the dialog in the release app on the live site, and the Local folder screen showed its branch and files. Left: macOS `.dmg` via the PR's workflow run.
- **Blockers:** none (installing `tauri-plugin-dialog` is approved by Pattadon)

## Handoff <!-- filled only when released back to Pending/ -->
—

## Done <!-- filled when moved to Done/ -->
- **Done on:** 2026-10-15 · **Verified by:** cargo test; every command and guard via `__TAURI_INTERNALS__.invoke` in tauri dev and the release app; folder picker by Kin; macOS CI build on PR #11
- **Result:** `OUTPUT/2026-10-15-2142-local-git-rust.md` (PR #11 merged)
