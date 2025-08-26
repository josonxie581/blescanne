@echo off
setlocal enabledelayedexpansion
title BLE Scanner Tauri Setup and Run

echo ========================================
echo   BLE Scanner Tauri Setup and Run
echo ========================================
echo.

:: Check Node.js
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Node.js is installed
    for /f %%i in ('node --version') do echo Version: %%i
) else (
    echo [ERROR] Node.js is not installed
    echo.
    echo Please install Node.js:
    echo 1. Visit https://nodejs.org/
    echo 2. Download and install LTS version
    echo 3. Restart and run this script again
    pause
    exit /b 1
)
echo.

:: Check Rust
echo [2/6] Checking Rust...
rustc --version >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Rust is installed
    for /f "tokens=1,2" %%i in ('rustc --version') do echo Version: %%i %%j
) else (
    echo [ERROR] Rust is not installed
    echo.
    echo Please install Rust:
    echo 1. Visit https://rustup.rs/
    echo 2. Download and run rustup-init.exe
    echo 3. Restart command prompt
    echo 4. Run this script again
    pause
    exit /b 1
)
echo.

:: Check Visual Studio Build Tools
echo [3/6] Checking Visual Studio Build Tools...
where cl.exe >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Visual Studio Build Tools found
) else (
    echo [WARNING] Visual Studio Build Tools may not be installed
    echo.
    echo If compilation fails, please install:
    echo 1. Visual Studio 2022 Build Tools
    echo 2. Or Visual Studio Community 2022
    echo 3. With "Desktop development with C++" workload
    echo.
)

:: Install Tauri CLI
echo [4/6] Installing Tauri CLI...
cargo install tauri-cli --quiet
if %errorLevel% == 0 (
    echo [OK] Tauri CLI installation completed
) else (
    echo [INFO] Tauri CLI may already be installed or installation failed
)
echo.

:: Install npm dependencies
echo [5/6] Installing npm dependencies...
call npm install
if %errorLevel% == 0 (
    echo [OK] npm dependencies installed successfully
) else (
    echo [ERROR] npm dependencies installation failed
    pause
    exit /b 1
)
echo.

:: Run development server
echo [6/6] Starting development server...
echo.
echo ========================================
echo   Starting BLE Scanner Tauri App
echo ========================================
echo.
echo First startup requires Rust compilation, please wait...
echo App window will open automatically after compilation
echo.
echo Press any key to start...
pause >nul

call npm run tauri dev

echo.
echo ========================================
echo   Application closed
echo ========================================
pause