@echo off
title BLE Scanner Tauri - Quick Run

echo Starting BLE Scanner Tauri App...
echo.
echo Installing dependencies...
call npm install
echo.
echo Starting development server...
echo First run may take 5-10 minutes to compile Rust code.
echo.
call npm run tauri dev
echo.
echo App closed. Press any key to exit...
pause >nul