// The desktop app is a thin shell: its window loads the deployed web app (build.frontendDist in
// tauri.conf.json). The window is built here rather than from the config so that links asking for a
// new window (target="_blank", window.open) open in the system browser instead of doing nothing.
// The page can also run local git on a folder the user picks (git.rs, capabilities/remote.json).
mod git;

use tauri::webview::{NewWindowResponse, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            git::git_check,
            git::git_status,
            git::git_remote_url,
            git::git_diff,
            git::git_stage,
            git::git_unstage,
            git::git_discard,
            git::git_commit,
            git::git_pull,
            git::git_push,
            git::git_branches,
            git::git_switch,
        ])
        .setup(|app| {
            // `npm run tauri dev` loads http://localhost:3000. Allow the same commands there, but only in
            // dev builds: in an installed app, any program on port 3000 could otherwise run git commands.
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                let mut dev = tauri::ipc::CapabilityBuilder::new("dev-localhost")
                    .window("main")
                    .remote("http://localhost:3000/*".into())
                    .permission("dialog:allow-open");
                for cmd in git::COMMANDS {
                    dev = dev.permission(format!("allow-{}", cmd.replace('_', "-")));
                }
                app.add_capability(dev)?;
            }

            let handle = app.handle().clone();
            // Same title and size as before: the window config has "create": false, so it's only built here.
            let config = app.config().app.windows.first().ok_or("no window in tauri.conf.json")?.clone();
            WebviewWindowBuilder::from_config(app.handle(), &config)?
                .on_new_window(move |url, _features| {
                    // Only web links; anything else (file:, custom schemes) is just blocked.
                    if matches!(url.scheme(), "http" | "https") {
                        if let Err(e) = handle.opener().open_url(url.as_str(), None::<&str>) {
                            eprintln!("couldn't open {url} in the browser: {e}");
                        }
                    }
                    NewWindowResponse::Deny
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running CoCommit");
}
