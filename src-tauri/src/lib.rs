// The desktop app is a thin shell: its window loads the deployed web app (build.frontendDist in
// tauri.conf.json). The window is built here rather than from the config so that links asking for a
// new window (target="_blank", window.open) open in the system browser instead of doing nothing.
use tauri::webview::{NewWindowResponse, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
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
