@echo off
title BLE Scanner - Final Application Builder
color 0A
echo ========================================
echo   BLE Scanner - Final Windows App
echo ========================================
echo.
echo Building production-ready Windows application...
echo This will create:
echo   1. Single executable (.exe)
echo   2. MSI installer package  
echo   3. NSIS installer package
echo.

echo [1/3] Installing/updating dependencies...
npm install --production=false
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/3] Building optimized frontend...
npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build frontend
    pause
    exit /b 1
)

echo.
echo [3/3] Building Windows application and installers...
echo This may take 5-10 minutes for first build...
npm run tauri build

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   🎉 BUILD SUCCESSFUL! 🎉
    echo ========================================
    echo.
    
    REM Show executable info
    if exist "src-tauri\target\release\blescanner.exe" (
        echo ✅ Standalone Executable:
        for %%f in ("src-tauri\target\release\blescanner.exe") do (
            echo    📁 File: %%~nxf
            echo    📏 Size: %%~zf bytes ^(~%calc_mb% MB^)
            echo    📍 Path: %%~dpf
        )
        echo.
    )
    
    REM Show installer packages
    echo ✅ Installation Packages:
    if exist "src-tauri\target\release\bundle\msi\" (
        echo    📦 MSI Installer:
        for /r "src-tauri\target\release\bundle\msi\" %%f in (*.msi) do (
            echo       - %%~nxf ^(%%~zf bytes^)
        )
    )
    
    if exist "src-tauri\target\release\bundle\nsis\" (
        echo    📦 NSIS Installer:
        for /r "src-tauri\target\release\bundle\nsis\" %%f in (*.exe) do (
            echo       - %%~nxf ^(%%~zf bytes^)
        )
    )
    
    echo.
    echo 🚀 How to distribute your app:
    echo.
    echo   Option 1 - Portable Application:
    echo   📋 Copy: src-tauri\target\release\blescanner.exe
    echo   📋 Send this single file to users
    echo   📋 No installation required
    echo.
    echo   Option 2 - Professional Installation:
    echo   📋 Use MSI installer for enterprise deployment
    echo   📋 Use NSIS installer for general users
    echo   📋 Both create Start Menu shortcuts and desktop icons
    echo.
    
    REM Ask user what to do next
    echo What would you like to do now?
    echo [1] Run the application
    echo [2] Open folder with all files
    echo [3] Exit
    echo.
    set /p choice="Enter your choice (1-3): "
    
    if "%choice%"=="1" (
        echo Starting BLE Scanner...
        start "" "src-tauri\target\release\blescanner.exe"
    ) else if "%choice%"=="2" (
        echo Opening build folder...
        explorer "src-tauri\target\release"
    )
    
) else (
    echo.
    echo ========================================
    echo   ❌ BUILD FAILED! ❌
    echo ========================================
    echo.
    echo 🔍 Common solutions:
    echo   1. Ensure Rust is properly installed and in PATH
    echo   2. Check internet connection for dependency downloads
    echo   3. Try running as Administrator
    echo   4. Check Windows Defender isn't blocking the build
    echo.
    echo 💡 Try running in PowerShell as Administrator:
    echo    PowerShell -ExecutionPolicy Bypass -File "setup-rust-and-build.ps1"
    echo.
)

echo.
pause