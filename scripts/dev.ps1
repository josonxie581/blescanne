# One-click setup and dev for BLE Scanner (Tauri + Vite)
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1

$ErrorActionPreference = 'Stop'

Write-Host "==> Checking Node.js/npm..." -ForegroundColor Cyan
try {
  $npmVersion = (npm -v)
  Write-Host "npm: $npmVersion" -ForegroundColor DarkGray
} catch {
  Write-Error "npm 未安装，请先安装 Node.js (建议 LTS) 后重试。"
  exit 1
}

Write-Host "==> Installing npm dependencies (this may take a while)..." -ForegroundColor Cyan
npm install

Write-Host "==> Checking Rust toolchain (cargo/tauri)..." -ForegroundColor Cyan
try {
  $cargoVersion = (cargo -V)
  Write-Host "cargo: $cargoVersion" -ForegroundColor DarkGray
} catch {
  Write-Warning "未检测到 Rust/cargo，将尝试安装 Rustup (需用户确认)。"
  Write-Host "请访问 https://www.rust-lang.org/tools/install 安装 Rust 后重试。" -ForegroundColor Yellow
  exit 1
}

# Ensure Tauri CLI exists (optional since we have devDependency @tauri-apps/cli)
# Decide dev mode based on SimpleBLE availability
$runRelease = $false
if ($env:SIMPLEBLE_LIB_DIR -and (Test-Path $env:SIMPLEBLE_LIB_DIR)) {
  $candidate = Join-Path $env:SIMPLEBLE_LIB_DIR 'SimpleBLE.lib'
  $candidate2 = Join-Path $env:SIMPLEBLE_LIB_DIR 'simpleble.lib'
  if (Test-Path $candidate -or Test-Path $candidate2) { $runRelease = $true }
}

if ($runRelease) {
  Write-Host "==> Detected SimpleBLE library, starting Tauri dev in RELEASE mode..." -ForegroundColor Cyan
  npm exec tauri dev -- --release
} else {
  Write-Host "==> Starting Tauri dev (Debug) (will start Vite per tauri.conf.json)..." -ForegroundColor Cyan
  npm exec tauri dev
}
