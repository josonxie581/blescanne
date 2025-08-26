# BLE Scanner Build Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BLE Scanner - Windows Build" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host

Write-Host "[1/3] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host
Write-Host "[2/3] Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to build frontend" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host
Write-Host "[3/3] Building Windows application..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow
npm run tauri build

if ($LASTEXITCODE -eq 0) {
    Write-Host
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host
    
    $exePath = "src-tauri\target\release\blescanner.exe"
    if (Test-Path $exePath) {
        Write-Host "Executable created:" -ForegroundColor Green
        Write-Host "  Path: $exePath" -ForegroundColor Cyan
        
        $fileInfo = Get-Item $exePath
        $sizeInMB = [math]::Round($fileInfo.Length / 1MB, 2)
        Write-Host "  Size: $sizeInMB MB" -ForegroundColor Cyan
        Write-Host "  Modified: $($fileInfo.LastWriteTime)" -ForegroundColor Cyan
        Write-Host
        
        $runApp = Read-Host "Run the application now? (y/n)"
        if ($runApp -eq "y" -or $runApp -eq "Y") {
            Start-Process $exePath
        }
    }
    
    Write-Host
    Write-Host "Additional installers may be available at:" -ForegroundColor Yellow
    Write-Host "- src-tauri\target\release\bundle\msi\" -ForegroundColor Cyan
    Write-Host "- src-tauri\target\release\bundle\nsis\" -ForegroundColor Cyan
    
} else {
    Write-Host
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Please check error messages above." -ForegroundColor Yellow
}

Write-Host
Read-Host "Press Enter to exit"