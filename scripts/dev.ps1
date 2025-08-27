## One-click setup and dev for BLE Scanner (Tauri + Vite)
## Usage: powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1

$ErrorActionPreference = 'Stop'

Write-Host "==> Checking Node.js/npm..." -ForegroundColor Cyan
try {
  $npmVersion = npm -v
  Write-Host ("npm: {0}" -f $npmVersion) -ForegroundColor DarkGray
} catch {
  Write-Error "npm not found. Please install Node.js (LTS recommended) and retry."
  exit 1
}

Write-Host "==> Installing npm dependencies (this may take a while)..." -ForegroundColor Cyan
npm install

Write-Host "==> Checking Rust toolchain (cargo/tauri)..." -ForegroundColor Cyan
try {
  $cargoVersion = cargo -V
  Write-Host ("cargo: {0}" -f $cargoVersion) -ForegroundColor DarkGray
} catch {
  Write-Warning "Rust/cargo not detected."
  Write-Host "Please install from https://www.rust-lang.org/tools/install and retry." -ForegroundColor Yellow
  exit 1
}

# Decide dev mode based on SimpleBLE availability
# Force Release build to avoid MSVC Debug/Release runtime mismatch with SimpleBLE
$runRelease = $true
if ($env:SIMPLEBLE_LIB_DIR -and (Test-Path -LiteralPath $env:SIMPLEBLE_LIB_DIR)) {
  $lib1 = Join-Path $env:SIMPLEBLE_LIB_DIR "SimpleBLE.lib"
  $lib2 = Join-Path $env:SIMPLEBLE_LIB_DIR "simpleble.lib"
  $lib1Exists = Test-Path -LiteralPath $lib1
  $lib2Exists = Test-Path -LiteralPath $lib2
  if ($lib1Exists -or $lib2Exists) {
    $runRelease = $true
  }
}

if ($runRelease) {
  Write-Host "==> Detected SimpleBLE library, starting Tauri dev in RELEASE mode..." -ForegroundColor Cyan
  npm run tauri:dev:release
} else {
  Write-Host "==> Starting Tauri dev (Debug). Vite will be started by tauri.conf.json..." -ForegroundColor Cyan
  npm run dev:app
}
