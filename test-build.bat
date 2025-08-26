@echo off
echo Testing BLE Scanner Tauri build...
echo.

echo Installing dependencies...
call npm install
if %errorLevel% neq 0 (
    echo Failed to install npm dependencies
    pause
    exit /b 1
)

echo.
echo Attempting to build...
call npm run tauri dev
if %errorLevel% neq 0 (
    echo Build failed, check error messages above
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
pause