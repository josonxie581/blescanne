@echo off
REM Clean build artifacts for frontend (Vite) and Tauri/Rust
REM Usage: scripts\clean.bat

setlocal ENABLEDELAYEDEXPANSION

for %%D in (node_modules dist .vite target) do (
  if exist "%%D" (
    echo Removing directory: %%D
    rmdir /S /Q "%%D"
  )
)

for %%D in (src-tauri\target src-tauri\debug src-tauri\release) do (
  if exist "%%D" (
    echo Removing directory: %%D
    rmdir /S /Q "%%D"
  )
)

for /R %%F in (*.tsbuildinfo *.log) do (
  if exist "%%F" (
    echo Deleting file: %%F
    del /F /Q "%%F"
  )
)

echo Clean completed.
endlocal
