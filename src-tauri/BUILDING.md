# Building the CoCommit desktop app

The desktop app is a thin Tauri window that loads the CoCommit web app. It has no static export and no local git. Which page it loads is set in `tauri.conf.json`:

| Key | Used by | Value |
|-----|---------|-------|
| `build.devUrl` | `npm run tauri dev` | `http://localhost:3000` (starts `npm run dev` for you) |
| `build.frontendDist` | `npm run tauri build` | `https://cocommit.vercel.app` (the live Vercel site) |

Each OS builds its own installer: build the `.msi` on Windows and the `.dmg` on a Mac.

## Links that open a new window

Links with `target="_blank"` (like "View on GitHub") and `window.open` open in the system browser, not in the app. That's `on_new_window` in `src-tauri/src/lib.rs`, with `tauri-plugin-opener`. Only `http`/`https` links are opened; anything else is blocked.

## Local git (Repo page, "Local folder")

The page can run the user's own `git` on a folder they pick, through 12 commands in `src-tauri/src/git.rs` (no shell, every path and branch checked). `capabilities/remote.json` lets only https://cocommit.vercel.app call them; `http://localhost:3000` is allowed in dev builds only (`lib.rs`). Git never asks for a password here: without a working git login, push and pull return an error.

## Which site the installed app shows

The installed app loads https://cocommit.vercel.app, so it shows whatever is deployed there, not your local code. Pushing to GitHub does not redeploy it yet: Pattadon deploys with `vercel deploy --prod`. A web change shows up in the desktop app after that deploy, with no rebuild needed. Rebuild only when `src-tauri/` changes or the URL moves.

## Windows installers from GitHub (no Rust needed)

`.github/workflows/desktop-windows.yml` builds the `.msi` and the setup `.exe` on a GitHub-hosted Windows machine:

1. On GitHub, open **Actions** → **Desktop app (Windows)** → **Run workflow** (branch `main`) → **Run workflow**.
2. Wait for the green check (about 10 minutes the first time, faster once the Rust cache is warm).
3. Open the run and download **CoCommit-windows-installers** under **Artifacts**. It's a `.zip` with both installers; artifacts are kept 14 days.

The setup `.exe` is the easiest to give people: double-click → installs for that Windows user, with Start menu and Desktop shortcuts. It isn't code-signed, so Windows says "unknown publisher": **More info** → **Run anyway**. Like the macOS build, it also runs on pull requests that change `src-tauri/`.

## macOS `.dmg` without a Mac (GitHub)

`.github/workflows/desktop-macos.yml` builds a universal `.dmg` (Apple Silicon and Intel) on a GitHub-hosted Mac:

1. On GitHub, open **Actions** → **Desktop app (macOS)** → **Run workflow** (branch `main`) → **Run workflow**.
2. Wait about 10–15 minutes for the green check.
3. Open the run and download **CoCommit-macos-dmg** under **Artifacts**. It's a `.zip` with the `.dmg` inside; artifacts are kept 14 days.

It also runs by itself on pull requests that change `src-tauri/`. The repo is private, so each run uses the team's GitHub Actions minutes (Mac minutes count 10×).

### Installing it on a Mac (for testers)

The app is signed ad hoc, not with an Apple developer account, so macOS warns the first time:

1. Open the `.dmg` and drag **CoCommit** into **Applications**.
2. Open it. If macOS says it "can't be opened" or "is damaged", run this once in Terminal, then open it again:
   ```zsh
   xattr -cr /Applications/CoCommit.app
   ```
   (It removes the "downloaded from the internet" flag that blocks unsigned apps.)
3. Or right-click `CoCommit.app` → **Open** → **Open**.

## macOS (`.dmg`) on your own Mac

1. Install the Xcode command line tools (skip if `xcode-select -p` prints a path):
   ```zsh
   xcode-select --install
   ```
2. Install Rust (accept the defaults), then open a new terminal:
   ```zsh
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. Install Node.js 20 or newer from https://nodejs.org (skip if `node -v` prints v20+).
4. In the repo folder, install packages:
   ```zsh
   npm install
   ```
5. Build:
   ```zsh
   npm run tauri build
   ```
6. The installer is at `src-tauri/target/release/bundle/dmg/CoCommit_0.1.0_aarch64.dmg` on Apple Silicon (`_x64` on Intel Macs). The app itself is in `src-tauri/target/release/bundle/macos/CoCommit.app`.

The build is not signed, so macOS blocks it the first time: right-click `CoCommit.app` → **Open** → **Open**. That's fine for the demo.

## Windows (`.msi` and `.exe` setup)

Needs Rust (https://rustup.rs, with the "Desktop development with C++" Visual Studio Build Tools it offers) and Node.js 20+. WebView2 already ships with Windows 11.

```powershell
npm install
```

```powershell
npm run tauri build
```

Installers land in `src-tauri\target\release\bundle\msi\CoCommit_0.1.0_x64_en-US.msi` and `src-tauri\target\release\bundle\nsis\CoCommit_0.1.0_x64-setup.exe`. The first build takes several minutes; Tauri downloads WiX and NSIS by itself.

## Development window

Runs the web app and opens it in a desktop window with hot reload (same command on both OSes):

```zsh
npm run tauri dev
```

```powershell
npm run tauri dev
```

## Icons

The app icon is the CoCommit mark (`public/logo-mark.svg`) in white on a black rounded square. Its source is `src-tauri/app-icon.svg`; `src-tauri/app-icon.png` is a 1024×1024 copy of it. To change the icon, edit the SVG (or replace it with a square PNG, 1024×1024 or larger) and regenerate:

```zsh
npx tauri icon src-tauri/app-icon.svg -o src-tauri/icons
```

```powershell
npx tauri icon src-tauri/app-icon.svg -o src-tauri/icons
```

Then rebuild the installers. Windows may keep showing the old icon for an installed app until it's reinstalled.

That command also creates `android/` and `ios/` folders inside `src-tauri/icons/`. Phone is out of scope, so delete them.
