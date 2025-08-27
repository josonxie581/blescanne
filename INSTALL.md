# BLE Scanner Tauri 安装与运行指南

## 📋 系统要求

- **操作系统**: Windows 10/11 (x64)
- **内存**: 至少 4GB RAM
- **存储**: 至少 2GB 可用空间

## 🛠️ 环境安装

### 1. 安装 Node.js

**方法一：官网下载**
1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 LTS 版本（推荐 v18.x 或更高）
3. 运行安装程序，按默认设置安装

**方法二：使用包管理器**
```powershell
# 使用 Chocolatey
choco install nodejs

# 使用 Winget
winget install OpenJS.NodeJS
```

**验证安装**：
```bash
node --version  # 应显示 v16.0+ 
npm --version   # 应显示 8.0+
```

### 2. 安装 Rust

**推荐方式：Rustup**
1. 访问 [rustup.rs](https://rustup.rs/)
2. 下载并运行 `rustup-init.exe`
3. 按照提示完成安装（选择默认选项）
4. 重启命令行或重新登录

**验证安装**：
```bash
rustc --version  # 应显示 1.70+
cargo --version  # 应显示 1.70+
```

### 3. 安装 Microsoft Visual Studio Build Tools

Tauri 在 Windows 上需要 MSVC 编译器：

**方法一：Visual Studio Installer**
1. 下载 [Visual Studio Installer](https://visualstudio.microsoft.com/downloads/)
2. 安装 "Desktop development with C++" 工作负载
3. 或者只安装 "MSVC v143 - VS 2022 C++ x64/x86 build tools"

**方法二：独立 Build Tools**
```powershell
# 使用 Chocolatey
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"
```

### 4. 安装 Tauri CLI

```bash
# 使用 Cargo 安装
cargo install tauri-cli

# 验证安装
cargo tauri --version
```

**或者使用 npm**：
```bash
npm install -g @tauri-apps/cli

# 验证安装
npx tauri --version
```

## 🚀 项目编译与运行

### 1. 进入项目目录

```bash
cd blescanner
```

### 2. 安装前端依赖

```bash
npm install
```

### 3. 开发模式运行

```bash
# 使用 npm scripts
npm run tauri dev

# 或直接使用 Tauri CLI
cargo tauri dev
```

**首次运行说明**：
- 首次运行会编译 Rust 代码，需要 5-10 分钟
- 后续运行会快很多（1-2 分钟）
- Vite 前端服务器会在 http://localhost:1420 启动

### 4. 生产构建

```bash
# 构建发布版本
npm run tauri build

# 或
cargo tauri build
```

**构建产物位置**：
```
src-tauri/target/release/bundle/
├── msi/              # Windows 安装包
├── nsis/             # NSIS 安装程序  
└── exe/              # 可执行文件
```

## 🔧 开发工作流

### 热重载开发
```bash
npm run tauri dev
```
- 前端代码修改后自动刷新
- Rust 代码修改后需要重新编译

### 调试模式
```bash
npm run tauri dev --debug
```
- 启用详细日志输出
- 显示 Rust 编译信息

### 清理构建缓存
```bash
# 清理前端构建
npm run clean

# 清理 Rust 构建
cargo clean

# 清理 node_modules
rm -rf node_modules
npm install
```

## 📱 应用功能

启动后你将看到：

1. **蓝牙适配器检测**
   - 自动检测系统蓝牙适配器
   - 显示适配器状态

2. **BLE 设备扫描**
   - 点击"开始扫描"搜索设备
   - 实时显示发现的设备

3. **设备交互**
   - 查看设备详细信息
   - 连接/断开设备（模拟）

## ⚠️ 常见问题

### Rust 编译错误
```bash
# 更新 Rust 工具链
rustup update

# 安装目标平台
rustup target add x86_64-pc-windows-msvc
```

### Node.js 依赖问题
```bash
# 清理缓存
npm cache clean --force

# 重新安装
rm -rf node_modules package-lock.json
npm install
```

### Tauri 编译失败
```bash
# 检查 Visual Studio Build Tools
cargo tauri info

# 重新安装 Tauri CLI
cargo install tauri-cli --force
```

### 权限问题
```bash
# 以管理员身份运行 PowerShell
# 或者检查防火墙设置
```

## 🎯 下一步

1. **集成真实 SimpleBLE**: 替换模拟数据
2. **添加新功能**: 如设备详情页、数据可视化
3. **优化性能**: 减小包体积、提升启动速度
4. **测试**: 添加单元测试和集成测试

## 🆘 获取帮助

遇到问题时：
1. 检查 [Tauri 官方文档](https://tauri.app/)
2. 查看 [GitHub Issues](https://github.com/tauri-apps/tauri/issues)
3. 运行 `cargo tauri info` 检查环境
4. 查看开发工具控制台输出