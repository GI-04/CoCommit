# Building the CoCommit desktop app

The desktop app is a thin Tauri window that loads the CoCommit web app. It has no static export and no local git. Which page it loads is set in `tauri.conf.json`:

| Key | Used by | Value |
|-----|---------|-------|
| `build.devUrl` | `npm run tauri dev` | `http://localhost:3000` (starts `npm run dev` for you) |
| `build.frontendDist` | `npm run tauri build` | `https://cocommit.vercel.app` (the live Vercel site) |

Each OS builds its own installer: build the `.msi` on Windows and the `.dmg` on a Mac.

## Which site the installed app shows

The installed app loads https://cocommit.vercel.app, so it shows whatever is deployed there, not your local code. Pushing to GitHub does not redeploy it yet: Pattadon deploys with `vercel deploy --prod`. A web change shows up in the desktop app after that deploy, with no rebuild needed. Rebuild only when `src-tauri/` changes or the URL moves.

## macOS (`.dmg`)

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

`src-tauri/app-icon.png` is a placeholder logo. To replace it, overwrite that file with a square PNG (1024×1024 or larger) and regenerate:

```zsh
npx tauri icon src-tauri/app-icon.png -o src-tauri/icons
```

```powershell
npx tauri icon src-tauri/app-icon.png -o src-tauri/icons
```

That command also creates `android/` and `ios/` folders inside `src-tauri/icons/`. Phone is out of scope, so delete them.
