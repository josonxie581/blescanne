@echo off
echo Cleaning build cache and attempting fresh build...
echo.

echo Cleaning Rust build cache...
cd src-tauri
cargo clean
cd ..

echo.
echo Cleaning npm cache...
npm cache clean --force

echo.
echo Starting fresh build...
npm run tauri dev

pause