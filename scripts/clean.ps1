# Clean build artifacts for frontend (Vite) and Tauri/Rust
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\clean.ps1

$ErrorActionPreference = 'Continue'

$paths = @(
  'node_modules',
  'dist',
  '.vite',
  '*.tsbuildinfo',
  # Rust/Tauri
  'target',
  'src-tauri/target',
  'src-tauri/debug',
  'src-tauri/release',
  'src-tauri/**/bundle',
  # Misc
  '*.log'
)

function Remove-Path($p) {
  Get-ChildItem -Path $p -Force -ErrorAction SilentlyContinue | ForEach-Object {
    if (Test-Path $_.FullName) {
      Write-Host "Removing: $($_.FullName)" -ForegroundColor Yellow
      if ($_.PSIsContainer) {
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue -- $_.FullName
      } else {
        Remove-Item -Force -ErrorAction SilentlyContinue -- $_.FullName
      }
    }
  }
}

foreach ($p in $paths) {
  Remove-Path $p
}

Write-Host "Clean completed." -ForegroundColor Green
