// Local git for the Repo page's "Local folder" mode (BOARD task 2026-10-15-local-git-rust.md,
// PLAN/2026-10-15-local-git.md). Each command runs the user's own `git` with fixed arguments and no
// shell, in a repo folder they picked. The live site can call these (capabilities/remote.json), so
// every argument is checked first, and there is deliberately no generic "run" command.
// Same commands and guards as the Node reference, CLAUDE/LIB/sources/general/local-git-bridge.mjs.

use std::path::{Component, Path, PathBuf};
use std::process::Command;

type GitResult = Result<String, String>;

/// Runs `git <args>` in `cwd`. Exit codes in `ok_codes` count as success.
fn git(cwd: &Path, args: &[&str], ok_codes: &[i32]) -> GitResult {
    let mut cmd = Command::new("git");
    cmd.args(args)
        .current_dir(cwd)
        // Never wait for a password: no terminal prompt, no Git Credential Manager window.
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GCM_INTERACTIVE", "never");
    #[cfg(windows)]
    {
        // Don't flash a console window for every git call.
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let out = cmd.output().map_err(|e| match e.kind() {
        std::io::ErrorKind::NotFound => "Git isn't installed on this computer (or isn't on PATH). Install it from https://git-scm.com.".to_string(),
        _ => format!("Couldn't run git: {e}"),
    })?;
    let code = out.status.code().unwrap_or(-1);
    if ok_codes.contains(&code) {
        Ok(String::from_utf8_lossy(&out.stdout).into_owned())
    } else {
        let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
        Err(if err.is_empty() { format!("git {} failed (exit {code})", args.first().unwrap_or(&"")) } else { err })
    }
}

/// `repo` must be an absolute, existing folder inside a git repo. Returns the repo root.
fn repo_root(repo: &str) -> Result<PathBuf, String> {
    let path = Path::new(repo);
    if !path.is_absolute() {
        return Err("repo must be an absolute path".into());
    }
    if !path.is_dir() {
        return Err("repo folder not found".into());
    }
    let root = git(path, &["rev-parse", "--show-toplevel"], &[0])?;
    Ok(PathBuf::from(root.trim()))
}

/// A file inside the repo: relative, not an option, no `..`, so it can't point outside the repo.
fn check_file(file: &str) -> Result<&str, String> {
    let refused = || Err(format!("refused path: {file}"));
    if file.is_empty() || file.starts_with('-') || file.starts_with('/') || file.starts_with('\\') {
        return refused();
    }
    let path = Path::new(file);
    if path.is_absolute() || path.components().any(|c| !matches!(c, Component::Normal(_) | Component::CurDir)) {
        return refused();
    }
    // Windows drive paths like "C:x" and ".." written with the other slash.
    if file.contains(':') || file.split(['/', '\\']).any(|part| part == "..") {
        return refused();
    }
    Ok(file)
}

fn check_files(files: &[String]) -> Result<Vec<&str>, String> {
    if files.is_empty() {
        return Err("files must be a non-empty list".into());
    }
    files.iter().map(|f| check_file(f)).collect()
}

fn check_branch<'a>(root: &Path, branch: &'a str) -> Result<&'a str, String> {
    if branch.is_empty() || branch.starts_with('-') {
        return Err(format!("refused branch: {branch}"));
    }
    git(root, &["check-ref-format", "--branch", branch], &[0]).map_err(|_| format!("refused branch: {branch}"))?;
    Ok(branch)
}

/// Runs git off the main thread, so a slow pull or push doesn't freeze the window.
async fn blocking<F: FnOnce() -> GitResult + Send + 'static>(f: F) -> GitResult {
    tauri::async_runtime::spawn_blocking(f).await.map_err(|e| format!("git task failed: {e}"))?
}

/// `git <args> -- <files>` in the repo.
async fn on_files(repo: String, files: Vec<String>, args: &'static [&'static str]) -> GitResult {
    blocking(move || {
        let root = repo_root(&repo)?;
        let files = check_files(&files)?;
        let mut all: Vec<&str> = args.to_vec();
        all.push("--");
        all.extend(files);
        git(&root, &all, &[0])
    })
    .await
}

/// `git <args>` in the repo, no other input.
async fn in_repo(repo: String, args: &'static [&'static str]) -> GitResult {
    blocking(move || git(&repo_root(&repo)?, args, &[0])).await
}

#[tauri::command]
pub async fn git_check(repo: String) -> GitResult {
    blocking(move || repo_root(&repo).map(|root| root.to_string_lossy().into_owned())).await
}

#[tauri::command]
pub async fn git_status(repo: String) -> GitResult {
    in_repo(repo, &["status", "--porcelain=v2", "--branch", "-z", "--untracked-files=all"]).await
}

#[tauri::command]
pub async fn git_remote_url(repo: String) -> GitResult {
    in_repo(repo, &["remote", "get-url", "origin"]).await
}

#[tauri::command]
pub async fn git_diff(repo: String, file: String, mode: String) -> GitResult {
    blocking(move || {
        let root = repo_root(&repo)?;
        let file = check_file(&file)?;
        match mode.as_str() {
            "staged" => git(&root, &["diff", "--cached", "--", file], &[0]),
            "unstaged" => git(&root, &["diff", "--", file], &[0]),
            // Exit code 1 means "the files differ", which is the point here.
            "untracked" => git(&root, &["diff", "--no-index", "--", "/dev/null", file], &[0, 1]),
            _ => Err("mode must be staged, unstaged or untracked".into()),
        }
    })
    .await
}

#[tauri::command]
pub async fn git_stage(repo: String, files: Vec<String>) -> GitResult {
    on_files(repo, files, &["add"]).await
}

#[tauri::command]
pub async fn git_unstage(repo: String, files: Vec<String>) -> GitResult {
    on_files(repo, files, &["restore", "--staged"]).await
}

#[tauri::command]
pub async fn git_discard(repo: String, files: Vec<String>) -> GitResult {
    on_files(repo, files, &["restore"]).await
}

#[tauri::command]
pub async fn git_commit(repo: String, message: String) -> GitResult {
    blocking(move || {
        if message.trim().is_empty() {
            return Err("message is empty".into());
        }
        git(&repo_root(&repo)?, &["commit", "-m", &message], &[0])
    })
    .await
}

#[tauri::command]
pub async fn git_pull(repo: String) -> GitResult {
    in_repo(repo, &["pull", "--ff-only"]).await
}

#[tauri::command]
pub async fn git_push(repo: String) -> GitResult {
    in_repo(repo, &["push", "-u", "origin", "HEAD"]).await
}

#[tauri::command]
pub async fn git_branches(repo: String) -> GitResult {
    in_repo(repo, &["branch", "--format=%(refname:short)"]).await
}

#[tauri::command]
pub async fn git_switch(repo: String, branch: String, create: bool) -> GitResult {
    blocking(move || {
        let root = repo_root(&repo)?;
        let branch = check_branch(&root, &branch)?;
        let args: &[&str] = if create { &["switch", "-c", branch] } else { &["switch", branch] };
        git(&root, args, &[0])
    })
    .await
}

/// Command names, for the dev-only localhost capability in lib.rs (build.rs and capabilities/remote.json list them too).
#[cfg_attr(not(debug_assertions), allow(dead_code))]
pub const COMMANDS: &[&str] = &[
    "git_check",
    "git_status",
    "git_remote_url",
    "git_diff",
    "git_stage",
    "git_unstage",
    "git_discard",
    "git_commit",
    "git_pull",
    "git_push",
    "git_branches",
    "git_switch",
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn files_inside_the_repo_pass() {
        for ok in ["a.txt", "src/lib.rs", "dir\\file.md", "./x", "with space.txt", "dots..in..name"] {
            assert!(check_file(ok).is_ok(), "{ok} should pass");
        }
    }

    #[test]
    fn files_outside_the_repo_or_options_are_refused() {
        for bad in ["", "../x", "a/../../b", "..\\x", "/etc/passwd", "\\\\server\\share", "C:\\Windows", "C:x", "-rf", "--exec=x"] {
            assert!(check_file(bad).is_err(), "{bad} should be refused");
        }
    }

    #[test]
    fn empty_file_lists_are_refused() {
        assert!(check_files(&[]).is_err());
        assert!(check_files(&["ok.txt".into(), "../no".into()]).is_err());
    }
}
