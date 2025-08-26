# Smart Build Script for BLE Scanner
# This script handles PATH issues that prevent cargo from being found

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BLE Scanner - Smart Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host

# Function to find Rust/Cargo installation
function Find-Cargo {
    $cargoPaths = @(
        "$env:USERPROFILE\.cargo\bin\cargo.exe",
        "C:\Users\$env:USERNAME\.cargo\bin\cargo.exe",
        "$env:CARGO_HOME\bin\cargo.exe",
        (Get-Command cargo -ErrorAction SilentlyContinue).Source
    )
    
    foreach ($path in $cargoPaths) {
        if ($path -and (Test-Path $path)) {
            return $path
        }
    }
    
    # Try to find in common Rustup locations
    $rustupDirs = @(
        "$env:USERPROFILE\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin",
        "$env:USERPROFILE\.rustup\toolchains\stable-x86_64-pc-windows-gnu\bin"
    )
    
    foreach ($dir in $rustupDirs) {
        $cargoPath = Join-Path $dir "cargo.exe"
        if (Test-Path $cargoPath) {
            return $cargoPath
        }
    }
    
    return $null
}

# Check if cargo is in PATH
Write-Host "Checking build environment..." -ForegroundColor Yellow

try {
    $cargoVersion = cargo --version
    Write-Host "✅ Cargo found in PATH: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Cargo not in PATH, searching..." -ForegroundColor Yellow
    
    $cargoPath = Find-Cargo
    if ($cargoPath) {
        $cargoDir = Split-Path $cargoPath -Parent
        Write-Host "✅ Found Cargo at: $cargoPath" -ForegroundColor Green
        
        # Add to PATH for this session
        $env:PATH = "$cargoDir;$env:PATH"
        Write-Host "✅ Added Cargo to PATH for this session" -ForegroundColor Green
        
        # Verify it works now
        try {
            $cargoVersion = cargo --version
            Write-Host "✅ Cargo now accessible: $cargoVersion" -ForegroundColor Green
        } catch {
            Write-Host "❌ Still cannot access Cargo" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Cargo not found. Please install Rust from https://rustup.rs/" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    exit 1
}

Write-Host
Write-Host "Starting build process..." -ForegroundColor Yellow

# Step 1: Install dependencies
Write-Host "[1/3] Installing dependencies..." -ForegroundColor Cyan
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Step 2: Build frontend
Write-Host "[2/3] Building frontend..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend built successfully" -ForegroundColor Green

# Step 3: Build Tauri app
Write-Host "[3/3] Building Windows application..." -ForegroundColor Cyan
Write-Host "This may take 5-15 minutes for first build..." -ForegroundColor Yellow

# Use the found cargo path directly if needed
npm run tauri build

if ($LASTEXITCODE -eq 0) {
    Write-Host
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  🎉 BUILD SUCCESSFUL! 🎉" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host
    
    $exePath = "src-tauri\target\release\blescanner.exe"
    if (Test-Path $exePath) {
        $fileInfo = Get-Item $exePath
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        
        Write-Host "✅ Windows Executable Created:" -ForegroundColor Green
        Write-Host "   📁 Path: $exePath" -ForegroundColor Cyan
        Write-Host "   📏 Size: $sizeMB MB" -ForegroundColor Cyan
        Write-Host "   📅 Modified: $($fileInfo.LastWriteTime)" -ForegroundColor Cyan
        Write-Host
        
        Write-Host "🚀 Your application is ready!" -ForegroundColor Green
        Write-Host
        
        # Check for installers
        $msiPath = "src-tauri\target\release\bundle\msi"
        $nsisPath = "src-tauri\target\release\bundle\nsis"
        
        if (Test-Path $msiPath) {
            Write-Host "📦 MSI Installer also available at: $msiPath" -ForegroundColor Cyan
        }
        
        if (Test-Path $nsisPath) {
            Write-Host "📦 NSIS Installer also available at: $nsisPath" -ForegroundColor Cyan
        }
        
        Write-Host
        $testApp = Read-Host "Test the application now? (y/n)"
        if ($testApp -eq "y" -or $testApp -eq "Y") {
            Write-Host "Starting BLE Scanner..." -ForegroundColor Green
            Start-Process $exePath
        }
        
        $openFolder = Read-Host "Open build folder? (y/n)"
        if ($openFolder -eq "y" -or $openFolder -eq "Y") {
            explorer "src-tauri\target\release"
        }
        
    } else {
        Write-Host "⚠️  Executable not found at expected location" -ForegroundColor Yellow
        Write-Host "Check the src-tauri\target\release folder manually" -ForegroundColor Yellow
    }
    
} else {
    Write-Host
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ❌ BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host
    Write-Host "Build failed. Please check the error messages above." -ForegroundColor Yellow
}

Write-Host
Read-Host "Press Enter to exit"