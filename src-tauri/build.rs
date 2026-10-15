fn main() {
    // Declaring the app's own commands makes Tauri generate a permission for each
    // (allow-git-status, …), so capabilities/remote.json can allow exactly these and nothing else.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
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
    ])))
    .expect("failed to run tauri-build");
}
