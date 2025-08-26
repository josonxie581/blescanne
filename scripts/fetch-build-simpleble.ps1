param(
  [string]$RepoUrl = "https://github.com/simpleble/simpleble.git",
  [string]$Tag = "v0.10.3",
  [string]$Dest = "external/simpleble",
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

Write-Host "==> Preparing to fetch and build SimpleBLE ($Tag)" -ForegroundColor Cyan

# Ensure git and cmake exist
function Assert-Cmd($cmd) {
  try { Get-Command $cmd -ErrorAction Stop | Out-Null } catch { throw "Required command not found: $cmd" }
}
Assert-Cmd git
Assert-Cmd cmake

# Clone or update
if (Test-Path $Dest) {
  if ($Force) {
    Write-Host "Removing existing: $Dest" -ForegroundColor Yellow
    Remove-Item -Recurse -Force -- $Dest
  }
}

if (!(Test-Path $Dest)) {
  Write-Host "Cloning $RepoUrl to $Dest" -ForegroundColor Cyan
  git clone --depth 1 --branch $Tag $RepoUrl $Dest
} else {
  Write-Host "Repo exists. Fetching tags and checking out $Tag" -ForegroundColor Cyan
  Push-Location $Dest
  git fetch --tags
  git checkout $Tag
  Pop-Location
}

# Configure & Build (MSVC x64 Release)
# CMakeLists.txt resides under the 'simpleble' subfolder in this repo
$src = Join-Path $Dest "simpleble"
$buildDir = Join-Path $Dest "build"
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

Write-Host "==> Configuring CMake (VS2022 x64 Release)" -ForegroundColor Cyan
cmake -S $src -B $buildDir -G "Visual Studio 17 2022" -A x64 -DSIMPLEBLE_TESTS=OFF -DSIMPLEBLE_EXAMPLES=OFF

Write-Host "==> Building SimpleBLE (Release)" -ForegroundColor Cyan
cmake --build $buildDir --config Release -- /m

# Try to locate library and include dirs
$libCandidates = @(
  (Join-Path $buildDir "Release\SimpleBLE.lib"),
  (Join-Path $buildDir "lib\Release\SimpleBLE.lib"),
  (Join-Path $buildDir "Release\simpleble.lib"),
  (Join-Path $buildDir "lib\Release\simpleble.lib")
)
$libPath = $libCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$includeCandidates = @(
  (Join-Path $src "include"),
  (Join-Path $src "simpleble\include"),
  (Join-Path $src "api\include")
)
$incPath = $includeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

Write-Host ""; Write-Host "==> Build summary" -ForegroundColor Green
if ($libPath) { Write-Host "LIB: $libPath" -ForegroundColor Green } else { Write-Host "[!] Library file not found (will vary by CMake version)" -ForegroundColor Yellow }
if ($incPath) { Write-Host "INCLUDE: $incPath" -ForegroundColor Green } else { Write-Host "[!] Include folder not found" -ForegroundColor Yellow }

# Emit environment helper script
$envFile = Join-Path $Dest "set-simpleble-env.ps1"
$libDir = if ($libPath) { (Resolve-Path (Split-Path -Parent $libPath)).Path } else { "" }
$incAbs = if ($incPath) { (Resolve-Path $incPath).Path } else { "" }
$envContent = @"
`$env:SIMPLEBLE_LIB_DIR = "$libDir"
`$env:SIMPLEBLE_INCLUDE_DIR = "$incAbs"
Write-Host "SIMPLEBLE env set" -ForegroundColor Green
"@
$envContent | Out-File -Encoding utf8 -FilePath $envFile
if (Test-Path $envFile) {
  Write-Host "==> To set environment for this session:" -ForegroundColor Cyan
  Write-Host "`t.\$envFile" -ForegroundColor Yellow
}

Write-Host "Done." -ForegroundColor Green
