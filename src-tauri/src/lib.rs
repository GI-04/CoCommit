// The desktop app is a thin shell: its window loads the deployed web app
// (build.frontendDist in tauri.conf.json), so there is no Rust-side logic yet.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running CoCommit");
}
