@echo off
echo Testing compilation after Clone fix...
echo.

cd src-tauri
echo Cleaning previous build...
cargo clean

echo.
echo Attempting compilation...
cargo build

if %errorLevel% == 0 (
    echo.
    echo [SUCCESS] Compilation successful!
    echo Now you can run: npm run tauri dev
) else (
    echo.
    echo [ERROR] Compilation failed. Check error messages above.
)

cd ..
pause