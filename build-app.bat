@echo off
chcp 65001 >nul
title BLE Scanner Build
echo ========================================
echo   BLE Scanner - Windows Build
echo ========================================
echo.

echo [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/3] Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build frontend
    pause
    exit /b 1
)

echo.
echo [3/3] Building Windows application...
echo This may take several minutes...
call npm run tauri build

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Executable created at:
    echo src-tauri\target\release\blescanner.exe
    echo.
    
    if exist "src-tauri\target\release\blescanner.exe" (
        echo File details:
        dir "src-tauri\target\release\blescanner.exe"
        echo.
        
        set /p run_app="Run the application now? (y/n): "
        if /i "%run_app%"=="y" (
            start "" "src-tauri\target\release\blescanner.exe"
        )
    )
    
    echo.
    echo Check these folders for installers:
    echo - src-tauri\target\release\bundle\msi\
    echo - src-tauri\target\release\bundle\nsis\
    echo.
    
) else (
    echo.
    echo ========================================
    echo   BUILD FAILED!
    echo ========================================
    echo Please check error messages above.
)

pause