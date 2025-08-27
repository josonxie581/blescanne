# BLE Scanner - Tauri + TypeScript + React

[![Windows CI - Build and Package](https://github.com/josonxie581/blescanne/actions/workflows/windows-build.yml/badge.svg)](https://github.com/josonxie581/blescanne/actions/workflows/windows-build.yml)

Windows-only BLE device scanner built with SimpleBLE, Tauri, TypeScript, and React.

[中文说明 (Chinese)](./README.md)

## ✨ Features

- Fast and lightweight (Tauri, ~10MB app size)
- Modern UI (React + TypeScript + Tailwind CSS)
- Full BLE scanning/connection/communication
- Type-safe end-to-end
- Platform: Windows 10/11 only

## 🛠️ Tech Stack

### Frontend

- React 18
- TypeScript
- Tailwind CSS
- Lucide React (icons)
- Vite (bundler)

### Backend

- Rust (business logic)
- Tauri (desktop framework)
- SimpleBLE (BLE library)
- Tokio (async runtime)

## 🚀 Quick Start (Clone, Build, and Run)

### Prerequisites (Windows 10/11)

- Node.js ≥ 18 and npm
- Rust stable (MSVC toolchain)
- Visual Studio 2022 with “Desktop development with C++”
- Git
- Optional: NSIS and WiX (to produce installers; skip if you only need a runnable exe)

### Steps

> Important: Run the following commands in Windows PowerShell (not in CMD or Git Bash).

```powershell
# 1) Clone and enter the project
git clone https://github.com/josonxie581/blescanne.git
cd blescanne

# 2) Build and configure SimpleBLE v0.10.3
npm run simpleble:build
.\external\simpleble\set-simpleble-env.ps1

# 3) Install dependencies
npm install

# 4) Development (hot reload)
npm run setup-and-dev

# 5) Or build an installer (will run vite build and bundle frontend)
npm run tauri build
```

Artifacts:

- Installers: `src-tauri/target/release/bundle/nsis/` or `.../msi/`
- Standalone exe: `src-tauri/target/release/BLE Scanner.exe`

Note: Do not run the raw exe produced by `cargo build` directly; it may show “tauri.localhost refused to connect”. Use `npm run tauri build` output, or run `npm run build` first and then `cargo build --release`.

### One-click dev scripts

- PowerShell: `npm run setup-and-dev` (equivalent to `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1`)
- Batch: `.\scripts\dev.bat`

## ✅ CI Verification (Clone builds successfully)

This repo ships a Windows CI workflow to validate it builds from a clean clone.

- Workflow: `.github/workflows/windows-build.yml`
- Triggers: push/PR to main or master
- Steps (Windows Server 2022):

  - Install Node 18, Rust (MSVC), NSIS, WiX
  - Build SimpleBLE v0.10.3 (script: `scripts/fetch-build-simpleble.ps1` or `npm run simpleble:build`)
  - Run `tauri build` (runs `vite build` first and embeds static assets)
  - Upload installer artifacts (MSI and NSIS)

How to use:

1) Open the GitHub Actions page and locate “Windows CI - Build and Package”.
2) Ensure the latest run is green.
3) Open the run and download MSI/EXE artifacts.

The status badge above links directly to the workflow page.

## 🔗 Integrate and Link C++ SimpleBLE v0.10.3 (Windows only)

If you want to build and link the official C++ SimpleBLE v0.10.3:

1) Auto-fetch and build

```powershell
npm run simpleble:build
```

The script will:

- Clone <https://github.com/simpleble/simpleble.git> at tag v0.10.3
- Build with Visual Studio 2022 (MSVC) x64 Release
- Generate `external/simpleble/set-simpleble-env.ps1`

1) Set environment variables for the current session

```powershell
.\external\simpleble\set-simpleble-env.ps1
```

This sets:

- SIMPLEBLE_LIB_DIR: directory containing SimpleBLE.lib
- SIMPLEBLE_INCLUDE_DIR: headers directory

1) Optional: prefer static link

```powershell
$env:SIMPLEBLE_LINK_STATIC = "1"
```

1) Start dev or build

```powershell
npm run setup-and-dev
# or
npm run tauri build
```

Note: the Rust build script auto-adds link search path and links SimpleBLE when `SIMPLEBLE_LIB_DIR` is present.

## 🧪 Production Build

```powershell
npm run tauri build
```

Output is under `src-tauri/target/release/bundle/`.

### Build only a runnable exe (no installer)

```powershell
# Build frontend first
npm run build

# Then build backend (Release will embed dist)
Push-Location src-tauri
cargo build --release
Pop-Location

# Run the exe (no dev server needed)
start ".\src-tauri\target\release\BLE Scanner.exe"
```

## 📁 Project Structure

```text
blescanner/
├── src/                    # React front-end
│   ├── components/
│   ├── services/
│   ├── types/
│   └── App.tsx
├── src-tauri/              # Rust back-end
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```

## ❓ FAQ

- “tauri.localhost refused to connect” at runtime

  - Use `npm run tauri build` output, or run `npm run build` first and then `cargo build --release`.

- `tauri` command not found

  - Run `npm install` first; the project includes `@tauri-apps/cli`. Then use `npm run tauri build`.

- Link error: cannot open SimpleBLE.lib

  - Run `npm run simpleble:build` and then `.\external\simpleble\set-simpleble-env.ps1`. Prefer Release builds.

- Clean build artifacts

  - `npm run clean` (or `.\scripts\clean.bat`).

## 📄 License

BUSL-1.1 license, based on the SimpleBLE project.
