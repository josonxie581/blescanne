# BLE Scanner - Tauri + TypeScript + React

<!-- 将 OWNER/REPO 替换为你的 GitHub 仓库路径，例如 user/blescanne -->
[![Windows CI - Build and Package](https://github.com/josonxie581/blescanne/actions/workflows/windows-build.yml/badge.svg)](https://github.com/josonxie581/blescanne/actions/workflows/windows-build.yml)

一个基于 SimpleBLE、Tauri、TypeScript 和 React 构建的 Windows 平台 BLE 设备扫描应用程序（当前仅支持 Windows 10/11）。

## ✨ 特性

- 🚀 **高性能**: 使用 Tauri 构建，体积小（~10MB），启动快
- 📱 **现代 UI**: 基于 React + TypeScript + Tailwind CSS 的响应式界面
- 🔵 **BLE 功能**: 完整的 BLE 设备扫描、连接和通信功能
- 🔒 **类型安全**: 完全使用 TypeScript 开发
- 🎯 **平台**: 当前仅支持 Windows 10/11

## 🛠️ 技术栈

### 前端

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Lucide React** - 图标库
- **Vite** - 构建工具

### 后端

- **Rust** - 后端逻辑
- **Tauri** - 桌面应用框架
- **SimpleBLE** - BLE 通信库
- **Tokio** - 异步运行时

## 快速开始（克隆后可编译与开发）

### 🧰 前置依赖（Windows 10/11）

- Node.js ≥ 18 与 npm
- Rust（stable, MSVC 工具链）
- Visual Studio 2022（包含“使用 C++ 的桌面开发”组件）
- Git
- 可选：NSIS 与 WiX（用于生成安装包；若只生成可运行 exe 可跳过）

### 快速步骤

```powershell
# 1) 克隆并进入目录
git clone <你的仓库地址>
cd blescanne

# 2) 构建并配置 SimpleBLE v0.10.3
powershell -ExecutionPolicy Bypass -File .\scripts\fetch-build-simpleble.ps1
.\external\simpleble\set-simpleble-env.ps1

# 3) 开发（热更新）
npm run setup-and-dev

# 4) 或，生成安装包（会先 vite build 并内嵌前端）
npm install
npm run tauri build
```

产物位置：

- 安装器：`src-tauri/target/release/bundle/nsis/` 或 `.../msi/`
- 直接运行的 exe：`src-tauri/target/release/BLE Scanner.exe`

提示：不要直接运行用 `cargo build` 生成的“裸 exe”，否则可能出现 “tauri.localhost 拒绝连接”。请使用 `npm run tauri build` 产物，或先 `npm run build` 再 `cargo build --release`。

### 一键开发脚本

- PowerShell：`npm run setup-and-dev`（等价 `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1`）
- 批处理：`.\scripts\dev.bat`

## ✅ CI 验证（克隆后可编译执行）

本仓库已内置 Windows CI 工作流，自动验证“拉取代码后能否成功编译并打包”：

- 工作流文件：`.github/workflows/windows-build.yml`
- 触发方式：对 main/master 分支的 push 与 Pull Request
- CI 步骤（Windows Server 2022 环境）：

   - 安装 Node.js 18、Rust（MSVC）、NSIS 与 WiX
   - 构建 SimpleBLE v0.10.3（脚本：`scripts/fetch-build-simpleble.ps1`）
   - 执行 `tauri build`（会先 `vite build`，将前端静态资源内嵌至应用）
   - 上传安装包产物（MSI 与 NSIS 安装器）

使用方法：

1) 打开仓库的 GitHub Actions 页面，找到工作流 “Windows CI - Build and Package”。
2) 确认最新一次运行状态为绿色（成功）。
3) 进入该运行，下载 Artifacts（MSI/EXE 安装包），即可安装运行。

可选：在 README 顶部的状态徽章（需将链接中的 `OWNER/REPO` 替换为你仓库实际路径）可直达工作流页面。

### 集成并链接 C++ SimpleBLE v0.10.3（仅 Windows）

如需使用官方 C++ SimpleBLE 源码（v0.10.3）自行编译并链接到本项目：

1. 自动获取与编译：

   ```powershell
   npm run simpleble:build
   ```

   脚本会：
   - 克隆 <https://github.com/simpleble/simpleble.git> 并检出 tag v0.10.3
   - 使用 Visual Studio 2022 (MSVC) x64 Release 构建
   - 生成环境设置脚本 external/simpleble/set-simpleble-env.ps1

2. 设置本会话环境变量：

   ```powershell
   .\external\simpleble\set-simpleble-env.ps1
   ```

   这会设置：
   - SIMPLEBLE_LIB_DIR：库文件目录（含 SimpleBLE.lib）
   - SIMPLEBLE_INCLUDE_DIR：头文件目录

3. 可选：静态链接

   如需偏好静态链接，在构建前设置：

   ```powershell
   $env:SIMPLEBLE_LINK_STATIC = "1"
   ```

4. 正常启动开发或构建：

   ```powershell
   npm run setup-and-dev
   # 或
   npm run tauri build
   ```

注意：Rust 构建脚本会在检测到 SIMPLEBLE_LIB_DIR 时自动添加链接搜索路径并链接 SimpleBLE。

### 生产构建

```powershell
npm run tauri build
```

构建后的应用程序将位于 `src-tauri/target/release/bundle/` 目录中。

### 仅生成可运行 exe（无安装器）

```powershell
# 先构建前端静态资源
npm run build

# 再编译后端（Release 会内嵌 dist）
Push-Location src-tauri
cargo build --release
Pop-Location

# 运行 exe（无需开发服务器）
start ".\src-tauri\target\release\BLE Scanner.exe"
```

## 🎮 使用说明

### 基本功能

1. **蓝牙适配器检测**
   - 应用启动时自动检测可用的蓝牙适配器
   - 显示适配器状态（启用/禁用）

2. **设备扫描**
   - 点击"开始扫描"按钮搜索附近的 BLE 设备
   - 实时显示发现的设备
   - 支持停止扫描和清空设备列表

3. **设备信息**
   - 设备名称、MAC 地址
   - RSSI 信号强度
   - 发射功率
   - 连接状态和配对状态
   - 支持的 GATT 服务列表

4. **设备连接**
   - 支持连接可连接的设备
   - 连接状态指示
   - 断开连接功能

### 界面说明

- **深色主题**: 现代化的深色界面设计
- **响应式布局**: 支持不同屏幕尺寸
- **实时更新**: 扫描过程中实时显示新发现的设备
- **状态指示**: 清晰的视觉反馈和状态提示

## 🔧 开发指南

### 项目结构

```text
blescanner/
├── src/                    # React 前端源码
│   ├── components/         # React 组件
│   ├── services/          # API 服务
│   ├── types/             # TypeScript 类型定义
│   └── App.tsx            # 主应用组件
├── src-tauri/             # Rust 后端源码
│   ├── src/
│   │   └── main.rs        # 主要的 Rust 逻辑
│   ├── Cargo.toml         # Rust 依赖配置
│   └── tauri.conf.json    # Tauri 应用配置
└── package.json           # Node.js 依赖配置
```

### 添加新功能

1. **前端功能**:
   - 在 `src/components/` 中创建新的 React 组件
   - 在 `src/services/` 中添加新的 API 服务
   - 更新 `src/types/` 中的 TypeScript 类型定义

2. **后端功能**:
   - 在 `src-tauri/src/main.rs` 中添加新的 Tauri 命令
   - 使用 `#[tauri::command]` 标记导出给前端的函数
   - 在 `invoke_handler` 中注册新命令

## ❓ 常见问题（FAQ）

- 运行时提示 “tauri.localhost 拒绝连接”？

   - 使用 `npm run tauri build` 生成的产物，或先 `npm run build` 再 `cargo build --release`。

- `tauri` 命令不存在？

   - 先执行 `npm install`，项目中包含 `@tauri-apps/cli`，随后用 `npm run tauri build`。

- 链接错误：找不到 SimpleBLE.lib？

   - 确保先运行 `scripts/fetch-build-simpleble.ps1`，并执行 `.\external\simpleble\set-simpleble-env.ps1`；优先使用 Release 构建。

- 需要清理编译产物？

   - `npm run clean`（或 `.\scripts\clean.bat`）。

## 🚀 性能优势

与传统的 Electron 应用相比：

- **体积更小**: ~10MB vs ~100MB+
- **内存占用更少**: ~50MB vs ~200MB+
- **启动更快**: <2秒 vs >5秒
- **更好的系统集成**: 原生性能和体验

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

基于 SimpleBLE 项目的 BUSL-1.1 许可证。
