// The desktop app is a thin shell: its window loads the deployed web app (build.frontendDist in
// tauri.conf.json). The window is built here rather than from the config so that links asking for a
// new window (target="_blank", window.open) open in the system browser instead of doing nothing.
// The page can also run local git on a folder the user picks (git.rs, capabilities/remote.json).
mod git;

use tauri::webview::{NewWindowResponse, WebviewWindowBuilder};
use tauri::{Manager, Url};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_opener::OpenerExt;

// GitHub sign-in runs in the system browser (the window can't show GitHub's pages). The browser ends on
// cocommit://auth?ticket=…; the window then loads the site's /auth/desktop/finish with that ticket, which sets the
// session in the app (PLAN/2026-10-16-desktop-github-login.md).
#[cfg(debug_assertions)]
const SITE: &str = "http://localhost:3000";
#[cfg(not(debug_assertions))]
const SITE: &str = "https://cocommit.vercel.app";

/// The finish URL for a `cocommit://auth?ticket=…` link; anything else is ignored.
fn finish_url(link: &Url) -> Option<Url> {
    if link.scheme() != "cocommit" || link.host_str() != Some("auth") {
        return None;
    }
    let ticket = link.query_pairs().find(|(k, _)| k == "ticket")?.1.into_owned();
    let mut url = Url::parse(SITE).ok()?.join("/auth/desktop/finish").ok()?;
    url.query_pairs_mut().append_pair("ticket", &ticket);
    Some(url)
}

fn handle_links(app: &tauri::AppHandle, links: impl IntoIterator<Item = Url>) {
    let Some(url) = links.into_iter().find_map(|l| finish_url(&l)) else { return };
    if let Some(window) = app.get_webview_window("main") {
        if let Err(e) = window.navigate(url) {
            eprintln!("couldn't open the sign-in result: {e}");
        }
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    // First plugin, as the docs require: a second launch (Windows/Linux open the deep link that way) is handed to the
    // running app instead of starting another one.
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
        handle_links(app, argv.iter().filter_map(|a| Url::parse(a).ok()));
    }));
    builder
        .plugin(tauri_plugin_deep_link::init())
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

            let links = app.handle().clone();
            app.deep_link().on_open_url(move |event| handle_links(&links, event.urls()));

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auth_link_becomes_finish_url() {
        let url = finish_url(&Url::parse("cocommit://auth?ticket=abc_-9").unwrap()).unwrap();
        assert_eq!(url.path(), "/auth/desktop/finish");
        assert_eq!(url.query(), Some("ticket=abc_-9"));
    }

    #[test]
    fn other_links_are_ignored() {
        assert!(finish_url(&Url::parse("cocommit://other?ticket=a").unwrap()).is_none());
        assert!(finish_url(&Url::parse("https://evil.example/auth?ticket=a").unwrap()).is_none());
        assert!(finish_url(&Url::parse("cocommit://auth").unwrap()).is_none());
    }
}
