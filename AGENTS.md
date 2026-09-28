# Learning Machine Agent Guide

本仓库是一个 Windows 优先、Local First 的 Tauri 2 + React + TypeScript 桌面应用。React 负责界面，Rust 命令负责本地文件、Git 与窗口能力。

## Startup Workflow

开始写代码前必须：

1. 确认工作目录是仓库根目录，并执行 `git status --short --branch`。
2. 完整阅读本文件、`README.md`、`feature_list.json` 和 `progress.md`；大型续接任务再读 `session-handoff.md`。
3. 查看最近提交：`git log --oneline -5`。
4. 运行快速基线：`corepack pnpm typecheck`。修改 Rust 时再运行 `cargo test --manifest-path src-tauri/Cargo.toml`。
5. 从 `feature_list.json` 选择唯一一个 `in-progress` 功能；没有活动功能时，先新增或激活一项再实现。

若基线检查在修改前已经失败，先记录到 `progress.md`，不要把既有失败描述成当前任务造成的失败。

## Before Implementation

收到功能需求后，不要立即编码。先结合用户需求和仓库现状整理任务合同，包含：

- **Goal**：本次任务要达成的结果。
- **User-visible behavior**：用户最终可以观察到的行为变化。
- **Scope**：本次允许修改和实现的范围。
- **Non-goals**：明确不在本次处理的事项。
- **Constraints**：技术、安全、兼容性和用户授权限制。
- **Acceptance criteria**：可逐项判断完成与否的验收标准。
- **Verification plan**：证明实现正确所需运行的检查与人工验证。

执行顺序：

1. 阅读相关代码、文档和当前状态，区分用户明确要求与合理假设。
2. 如果存在会改变产品行为的重要歧义，先询问用户；在得到答案前不要实现受影响部分。
3. 如果不存在重要歧义，将任务合同保存到 `feature_list.json` 对应功能的 `contract` 字段。
4. 合同完整后，将该功能设为唯一 `in-progress`，再开始实现。

`contract` 必须使用以下字段：`goal` 为字符串，其余六项为字符串数组：`userVisibleBehavior`、`scope`、`nonGoals`、`constraints`、`acceptanceCriteria`、`verificationPlan`。不得用聊天记录代替已保存的合同；实现范围或产品行为发生实质变化时，先更新合同再继续。

## Project Boundaries

- 项目内容存储在用户选择的目录中；不得把真实学习资料写入仓库。
- 文件操作只能落在用户项目的允许范围内。资料树操作限制在 `materials/` 和 `notes/`；反馈位于 `feedback/`；项目书是 `project.md`。
- 前端不得直接假设浏览器预览具备 Tauri 原生能力。所有文件、Git、系统对话框和多窗口操作都通过 `src/lib/desktop.ts` 调用 Rust 命令。
- Rust 文件路径必须经过安全拼接或规范化校验；禁止路径逃逸、符号链接逃逸和静默覆盖同名文件。
- 保存用户文档时保留外部修改冲突检测。破坏性操作必须有明确目标和用户确认。
- Git 历史是可选增强；未安装 Git 时核心项目、反馈、资料和笔记功能仍须可用。
- 不提交 `node_modules/`、`dist/`、`src-tauri/target/`、安装包、密钥、令牌或用户项目数据。

## Working Rules

- **One feature at a time**：同一时刻只允许一个功能处于 `in-progress`。
- **Stay in scope**：只修改当前功能及其验证、文档和状态文件；不要顺手重构无关代码。
- **Preserve user work**：工作区已有改动默认属于用户，不得重置、覆盖或删除。
- **Evidence before completion**：没有新鲜命令输出或明确人工验证记录，不得把功能标记为 `done`。
- **State is durable**：重要决定、阻塞、验证结果和下一步写入仓库文件，不依赖聊天记录。
- **Clean restart path**：结束时保持仓库可重启；下一会话只需读取状态文件并运行标准验证入口。
- **No silent dependency upgrades**：不得无请求地升级依赖；`package.json` 中现有 `latest` 是已知风险，不代表可以自动刷新版本。

## Verification Commands

快速检查：

- `corepack pnpm typecheck`
- 针对当前功能的相关测试

完整前端与 Rust 门禁：

- Windows PowerShell：`powershell -ExecutionPolicy Bypass -File .\init.ps1`
- Bash / Git Bash：`./init.sh`

脚本依次运行：

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `cargo test --manifest-path src-tauri/Cargo.toml`

发布安装包属于单独门禁：`corepack pnpm bundle:windows`。不要在普通功能修改中重复构建安装包。

## Definition of Done

功能只有同时满足以下条件才能标记为 `done`：

- [ ] 目标行为和边界条件已经实现。
- [ ] 相关测试、类型检查及受影响构建已实际运行。
- [ ] 桌面原生交互若无法自动化，已记录人工验证步骤与结果。
- [ ] `feature_list.json` 包含状态、依赖和验证证据。
- [ ] `progress.md` 已记录本次结果、风险和下一步。
- [ ] 仓库可由下一会话按照 Startup Workflow 继续。

## End of Session

结束会话前：

1. 更新 `feature_list.json`，确保最多一个 `in-progress`。
2. 更新 `progress.md` 的时间、完成项、验证证据、风险和下一步。
3. 大型或未完成任务更新 `session-handoff.md`，写明分支、修改文件和精确续接动作。
4. 执行 `git status --short`，确认没有意外生成物或敏感文件。
5. 只有用户要求时才提交或推送；不要自行 `git push`。

## Escalation

- 需求会改变用户数据格式、兼容性或安全边界：停止并向用户确认。
- 同一阻塞连续出现三次：记录证据并请求人工决策，不继续堆叠猜测性修复。
- 工作区出现来源不明的重叠修改：停止编辑相关文件并说明冲突。
- 需要删除、迁移或覆盖用户数据：必须先解析精确目标并获得明确授权。
