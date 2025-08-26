@echo off
echo Testing Tauri build without icons...
echo.

echo Clearing previous build cache...
cd src-tauri
cargo clean
cd ..

echo.
echo Attempting to run development server...
npm run tauri dev

pause