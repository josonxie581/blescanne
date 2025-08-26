# BLE Scanner Tauri 快速启动脚本 (PowerShell)
# 使用方法: 在 PowerShell 中运行 .\quick-start.ps1

Write-Host "========================================" -ForegroundColor Green
Write-Host "   BLE Scanner Tauri 快速启动脚本" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 检查执行策略
$executionPolicy = Get-ExecutionPolicy
if ($executionPolicy -eq "Restricted") {
    Write-Host "[!] PowerShell 执行策略受限" -ForegroundColor Yellow
    Write-Host "请运行: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    Write-Host ""
}

# 函数：检查命令是否存在
function Test-Command($Command) {
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# 1. 检查 Node.js
Write-Host "[1/6] 检查 Node.js..." -ForegroundColor Cyan
if (Test-Command "node") {
    Write-Host "[✓] Node.js 已安装" -ForegroundColor Green
    $nodeVersion = node --version
    Write-Host "版本: $nodeVersion" -ForegroundColor Gray
} else {
    Write-Host "[✗] Node.js 未安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "自动安装选项:" -ForegroundColor Yellow
    Write-Host "1. 使用 Winget: winget install OpenJS.NodeJS" -ForegroundColor Yellow
    Write-Host "2. 使用 Chocolatey: choco install nodejs" -ForegroundColor Yellow
    Write-Host "3. 手动下载: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    
    $choice = Read-Host "是否尝试使用 Winget 自动安装? (y/N)"
    if ($choice -eq "y" -or $choice -eq "Y") {
        Write-Host "正在安装 Node.js..." -ForegroundColor Yellow
        winget install OpenJS.NodeJS
        Write-Host "请重新运行此脚本" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "请手动安装 Node.js 后重新运行此脚本" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# 2. 检查 Rust
Write-Host "[2/6] 检查 Rust..." -ForegroundColor Cyan
if (Test-Command "rustc") {
    Write-Host "[✓] Rust 已安装" -ForegroundColor Green
    $rustVersion = rustc --version
    Write-Host "版本: $rustVersion" -ForegroundColor Gray
} else {
    Write-Host "[✗] Rust 未安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "请安装 Rust:" -ForegroundColor Yellow
    Write-Host "1. 访问 https://rustup.rs/" -ForegroundColor Yellow
    Write-Host "2. 下载并运行 rustup-init.exe" -ForegroundColor Yellow
    Write-Host "3. 重启 PowerShell" -ForegroundColor Yellow
    Write-Host "4. 重新运行此脚本" -ForegroundColor Yellow
    Write-Host ""
    
    $choice = Read-Host "是否打开 Rust 安装页面? (y/N)"
    if ($choice -eq "y" -or $choice -eq "Y") {
        Start-Process "https://rustup.rs/"
    }
    exit 1
}
Write-Host ""

# 3. 检查 Visual Studio Build Tools
Write-Host "[3/6] 检查 Visual Studio Build Tools..." -ForegroundColor Cyan
$vsInstalled = $false
try {
    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vsWhere) {
        $vsInstalls = & $vsWhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
        if ($vsInstalls) {
            $vsInstalled = $true
        }
    }
} catch {
    # vswhere 不存在或执行失败
}

if ($vsInstalled) {
    Write-Host "[✓] Visual Studio Build Tools 已安装" -ForegroundColor Green
} else {
    Write-Host "[!] Visual Studio Build Tools 可能未安装" -ForegroundColor Yellow
    Write-Host "如果编译失败，请安装:" -ForegroundColor Yellow
    Write-Host "1. Visual Studio 2022 Build Tools" -ForegroundColor Yellow
    Write-Host "2. 或 Visual Studio Community 2022" -ForegroundColor Yellow
    Write-Host "3. 包含 'Desktop development with C++' 工作负载" -ForegroundColor Yellow
}
Write-Host ""

# 4. 安装 Tauri CLI
Write-Host "[4/6] 检查/安装 Tauri CLI..." -ForegroundColor Cyan
if (Test-Command "cargo") {
    try {
        cargo tauri --version | Out-Null
        Write-Host "[✓] Tauri CLI 已安装" -ForegroundColor Green
    } catch {
        Write-Host "[!] 正在安装 Tauri CLI..." -ForegroundColor Yellow
        cargo install tauri-cli --quiet
        Write-Host "[✓] Tauri CLI 安装完成" -ForegroundColor Green
    }
} else {
    Write-Host "[✗] Cargo 不可用，无法安装 Tauri CLI" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. 安装 npm 依赖
Write-Host "[5/6] 安装 npm 依赖..." -ForegroundColor Cyan
try {
    npm install
    Write-Host "[✓] npm 依赖安装完成" -ForegroundColor Green
} catch {
    Write-Host "[✗] npm 依赖安装失败" -ForegroundColor Red
    Write-Host "错误: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 6. 启动开发服务器
Write-Host "[6/6] 启动开发服务器..." -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   即将启动 BLE Scanner Tauri 应用" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "首次启动需要编译 Rust 代码，请耐心等待..." -ForegroundColor Yellow
Write-Host "编译完成后将自动打开应用窗口" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "按 Enter 键开始启动..."

try {
    npm run tauri dev
} catch {
    Write-Host ""
    Write-Host "[✗] 启动失败" -ForegroundColor Red
    Write-Host "错误: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "故障排除建议:" -ForegroundColor Yellow
    Write-Host "1. 检查所有依赖是否正确安装" -ForegroundColor Yellow
    Write-Host "2. 尝试运行: cargo clean" -ForegroundColor Yellow
    Write-Host "3. 重新运行此脚本" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   脚本执行完成" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Read-Host "按 Enter 键退出..."