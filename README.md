# Learning Machine / 学习机

一个围绕“设立目标 → 学习 → 现实反馈 → 调整目标 → 保存历史”构建的 Local First 桌面学习项目工作台。

## 当前能力

- 创建或打开真实的本地学习项目目录；
- 使用模块化模板创建 `project.md` 与 `feedback/*.md`；
- Markdown 编辑、GFM 预览与外部修改冲突检测；
- 资料与笔记文件树及受限项目路径操作；
- Git 自动初始化、重要版本提交、友好历史与 `project.md` diff；
- 项目概览、归档、浅色/深色模式与明确错误状态；
- 未安装 Git 时核心文件功能仍可使用。

## 开发环境

需要 Node.js、pnpm、Rust stable MSVC、Windows C++ Build Tools 和 WebView2。

```powershell
corepack pnpm install
corepack pnpm tauri dev
```

仅运行浏览器开发预览：

```powershell
corepack pnpm dev
```

浏览器预览使用内置示例项目；真实文件、原生对话框和 Git 操作只在 Tauri 窗口中启用。

## 验证

```powershell
powershell -ExecutionPolicy Bypass -File .\init.ps1
```

该命令依次运行前端类型检查、前端测试、生产构建和 Rust 测试。Git Bash 或类 Unix 环境可运行 `./init.sh`。

## Agent Harness

本仓库使用 `AGENTS.md`、`feature_list.json`、`progress.md` 和 `session-handoff.md` 保持 AI 编码任务在不同会话间可恢复。代理开始工作前应先阅读 `AGENTS.md`，选择唯一活动功能，并在宣称完成前记录实际验证证据。

## 项目数据

Learning Machine 不把学习内容藏在私有数据库里。每个项目保持如下开放结构：

```text
project.md
feedback/
materials/
notes/
archive/
.learning-machine/project.json
```

应用只对用户主动选择的项目目录执行文件操作；路径逃逸和符号链接逃逸会被后端拒绝。
