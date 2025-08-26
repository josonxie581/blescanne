Param(
  [switch]$RunApp
)

Write-Host "[smoke] Loading SimpleBLE env if exists..."
if (Test-Path -Path "$PSScriptRoot\..\external\simpleble\set-simpleble-env.ps1") {
  . "$PSScriptRoot\..\external\simpleble\set-simpleble-env.ps1"
}

Push-Location "$PSScriptRoot\..\src-tauri"
try {
  Write-Host "[smoke] Building Release backend (cargo build --release)..."
  cargo build --release

  $exe = Join-Path (Resolve-Path .).Path 'target\release\BLE Scanner.exe'
  if (-not (Test-Path $exe)) {
    throw "Release exe not found: $exe"
  }
  Write-Host "[smoke] Release exe built: $exe"

  if ($RunApp) {
    Write-Host "[smoke] Starting app (this exe expects packed frontend or dev server)."
    & $exe
  }
}
finally {
  Pop-Location
}

Write-Host "[smoke] Done. For a fully self-contained app, run: npm run tauri build"
