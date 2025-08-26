@echo off
title BLE Scanner - Simple Build
echo ========================================
echo   BLE Scanner - Windows Build
echo ========================================
echo.

echo Building Windows application...
echo.

npm run tauri build

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Your Windows executable is ready at:
    echo src-tauri\target\release\blescanner.exe
    echo.
    echo File size and info:
    dir "src-tauri\target\release\blescanner.exe"
    echo.
    echo Additional installers may be available at:
    echo src-tauri\target\release\bundle\
    echo.
    
    set /p run_now="Run the application now? (y/n): "
    if /i "%run_now%"=="y" (
        start "" "src-tauri\target\release\blescanner.exe"
    )
) else (
    echo.
    echo Build failed! Please check the error messages above.
)

pause