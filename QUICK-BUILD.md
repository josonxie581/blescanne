# BLE Scanner - 快速构建指南

## 🚨 构建前必需安装

### 1. 检查环境
运行环境检查脚本：
```powershell
# 在PowerShell中运行
.\check-build-env.ps1
```

### 2. 如果Rust未安装

**方法1：使用winget（推荐）**
```powershell
# 以管理员身份运行PowerShell
winget install Rustlang.Rustup
```

**方法2：手动安装**
1. 访问 https://rustup.rs/
2. 下载 `rustup-init.exe`
3. 以管理员身份运行
4. 重启命令行/PowerShell

### 3. 验证安装
```powershell
rustc --version
cargo --version
node --version
npm --version
```

## 🚀 构建应用程序

### 选项1：使用PowerShell（推荐）
```powershell
.\build-app.ps1
```

### 选项2：手动命令
```powershell
npm install
npm run build
npm run tauri build
```

### 选项3：使用bat文件
```cmd
.\build-app.bat
```

## 📦 构建输出

成功构建后，文件位于：

**单个可执行文件：**
```
src-tauri\target\release\blescanner.exe
```

**安装包：**
```
src-tauri\target\release\bundle\msi\BLE Scanner_0.1.0_x64_en-US.msi
src-tauri\target\release\bundle\nsis\BLE Scanner_0.1.0_x64-setup.exe
```

## 🐛 常见问题

### 问题1：cargo: program not found
**解决方案：**
- 确保Rust已正确安装
- 重启命令行窗口
- 检查环境变量PATH

### 问题2：构建超时
**解决方案：**
- 首次构建需要10-15分钟
- 确保网络连接稳定
- 关闭防病毒软件的实时保护

### 问题3：权限错误
**解决方案：**
- 以管理员身份运行
- 检查Windows Defender是否阻止

## 📋 构建检查清单

- [ ] Node.js 已安装 (v16+)
- [ ] Rust 已安装并在PATH中
- [ ] 网络连接正常
- [ ] 有足够磁盘空间 (>2GB)
- [ ] 防病毒软件已设置例外

## 🎯 分发文件

**推荐分发单个EXE文件：**
- 文件：`blescanner.exe`
- 大小：约15-25MB
- 优点：无需安装，双击运行

**企业分发使用MSI：**
- 支持组策略部署
- 专业安装体验

**普通用户使用NSIS：**
- 友好的安装向导
- 自动创建快捷方式

---

🔥 **提示：首次构建后，后续构建只需2-3分钟！**