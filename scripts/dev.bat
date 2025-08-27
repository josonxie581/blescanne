@echo off
REM One-click setup and dev for BLE Scanner (Tauri + Vite)
REM Usage: scripts\dev.bat

setlocal

echo ==> Installing npm dependencies...
call npm install || goto :err

echo ==> Starting Tauri dev (Release)...
call npm run tauri:dev:release || goto :err

echo Done.
endlocal
exit /b 0

:err
echo Script failed with error level %errorlevel%.
endlocal
exit /b %errorlevel%
