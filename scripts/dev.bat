@echo off
REM One-click setup and dev for BLE Scanner (Tauri + Vite)
REM Usage: scripts\dev.bat

setlocal

echo ==> Installing npm dependencies...
call npm install || goto :err

echo ==> Starting Tauri dev...
call npm exec tauri dev || goto :err

echo Done.
endlocal
exit /b 0

:err
echo Script failed with error level %errorlevel%.
endlocal
exit /b %errorlevel%
