@echo off
title BLE Scanner Tauri - Release Mode
 
echo Starting BLE Scanner Tauri App in Release Mode...
echo.
echo Installing dependencies...
call npm install
echo.
echo Starting development server with release backend...
echo First run may take 5-10 minutes to compile Rust code in release mode.
echo.
call npx tauri dev --release
echo.
echo App closed. Press any key to exit...
pause >nul