# BLE Scanner - Windows 应用程序构建指南

## 🎯 快速构建

### 方法1：自动构建脚本（推荐）
```bash
# 双击运行，全自动构建
build-final-app.bat
```

### 方法2：手动命令
```bash
# 安装依赖
npm install

# 构建应用程序
npm run tauri build
```

## 📦 构建输出

成功构建后，你将得到以下文件：

### 1. 单个可执行文件（便携版）
```
📁 src-tauri\target\release\blescanner.exe
```
- **大小**: 约 15-25 MB
- **使用**: 直接双击运行，无需安装
- **分发**: 可直接发送给用户

### 2. MSI 安装包（企业版）
```
📁 src-tauri\target\release\bundle\msi\BLE Scanner_0.1.0_x64_en-US.msi
```
- **大小**: 约 10-20 MB
- **特点**: 专业安装程序，支持静默安装
- **适用**: 企业环境、批量部署

### 3. NSIS 安装包（用户版）
```
📁 src-tauri\target\release\bundle\nsis\BLE Scanner_0.1.0_x64-setup.exe
```
- **大小**: 约 10-20 MB
- **特点**: 用户友好的安装向导
- **功能**: 自动创建桌面快捷方式和开始菜单

## 🔧 构建要求

### 必须安装
- [Node.js](https://nodejs.org/) (v16+)
- [Rust](https://rustup.rs/) (最新稳定版)

### Windows 特定要求
- Windows 10/11
- Visual Studio Build Tools 或 Visual Studio Community
- Windows SDK

## 🚀 分发选项

### 选项1：便携应用
- 优点：无需安装，即下即用
- 缺点：无自动更新，无系统集成
- 适合：临时使用、U盘携带

### 选项2：MSI 安装包
- 优点：企业级部署，支持组策略
- 缺点：需要管理员权限
- 适合：企业环境、IT管理

### 选项3：NSIS 安装包
- 优点：用户友好，自动更新支持
- 缺点：文件略大
- 适合：普通用户、软件分发

## 🛠️ 自定义构建

### 修改应用信息
编辑 `src-tauri/tauri.conf.json`：
```json
{
  "package": {
    "productName": "你的应用名称",
    "version": "1.0.0"
  },
  "tauri": {
    "bundle": {
      "identifier": "com.yourcompany.yourapp",
      "publisher": "你的公司名称"
    }
  }
}
```

### 修改应用图标
替换 `src-tauri/icons/icon.ico` 文件

### 修改窗口设置
编辑 `tauri.conf.json` 中的 `windows` 部分

## 🐛 常见问题

### 构建失败
1. **检查 Rust 安装**：`rustc --version`
2. **更新 Rust**：`rustup update`
3. **清理缓存**：`cargo clean`
4. **重新构建**：`npm run tauri build`

### 文件大小过大
- 使用 `npm run tauri build -- --config.tauri.bundle.targets=nsis` 只构建 NSIS
- 启用压缩：在构建配置中添加优化选项

### 权限问题
- 以管理员身份运行构建脚本
- 检查 Windows Defender 是否阻止文件

## 📋 构建检查清单

- [ ] Node.js 已安装且版本 ≥ 16
- [ ] Rust 已安装且在 PATH 中
- [ ] 依赖已安装 (`npm install`)
- [ ] 图标文件存在
- [ ] tauri.conf.json 配置正确
- [ ] 以管理员权限运行（如需要）

## 🎉 构建完成后

1. **测试应用**：先运行 .exe 文件确保功能正常
2. **病毒扫描**：通过 Windows Defender 扫描
3. **文档准备**：准备用户手册或安装说明
4. **分发准备**：选择合适的分发方式

---

**提示**：首次构建可能需要 10-15 分钟下载依赖项，后续构建会快很多。