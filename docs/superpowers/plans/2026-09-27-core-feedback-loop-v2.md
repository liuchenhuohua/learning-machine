# Learning Machine V2 Core Feedback Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Tauri 桌面应用中实现设计文档“页面与交互”部分描述的反馈—项目书调整—版本历史闭环。

**Architecture:** 保持 `project.md` 与 `feedback/*.md` 为数据源，在 Zustand 中只保存当前调整会话的临时草稿。项目书版本通过 Git commit trailer 持久关联反馈文件，前端通过现有 `desktopApi` 与新增的窄接口完成保存、差异确认和历史读取。

**Tech Stack:** Tauri 2、Rust、React 19、TypeScript、Zustand、CodeMirror 6、react-markdown、Vitest、Testing Library、Git CLI。

**Spec:** `D:\我的vibe coding项目\学习机v2\docs\superpowers\specs\2026-09-27-core-feedback-loop-design.md`（仅“页面与交互”部分；本计划的 Local First、真实文件、Tauri 与 Git 约束覆盖文档中的纯前端演示边界）

## Global Constraints

- 所有用户内容继续保存为真实、可读文件：项目书为 `project.md`，反馈为 `feedback/*.md`。
- 不引入云端、服务端数据库、固定偏差原因、调整类型、实验表单、AI 总结或自动建议。
- Git 不可用时反馈和项目书仍可保存；仅版本关联与历史能力明确降级。
- 不静默迁移、覆盖或破坏已有项目数据；外部修改必须阻止覆盖并提示用户刷新。
- 所有产品改动留在 `feature/v2-core-feedback-loop`；未经用户明确授权不 commit、push 或 merge。
- 保持现有简体中文界面、键盘可达性和可滚动的桌面布局。

## Review Focus

1. 已输入反馈内容后插入完整模板：不得无提示覆盖现有文字，应在当前内容后追加模板。
2. “保存并调整”中途失败或重试：不得重复创建反馈文件，文件已保存时应明确状态并允许继续进入调整。
3. 调整期间 `project.md` 被外部程序修改：确认保存必须报冲突，不能覆盖磁盘上的新内容。
4. Git 未安装、仓库异常或提交失败：真实文件保存仍成功，界面明确说明版本历史未记录。
5. 历史关联的反馈文件后来被移动或删除：项目书差异仍可查看，“为什么改”显示文件缺失提示而不是整页失败。

---

## File Structure

- `src/types/domain.ts`：扩展页面类型、调整草稿和 Git 关联类型。
- `src/stores/appStore.ts`：管理当前项目内的临时调整会话，切换项目时清理。
- `src/features/feedback/FeedbackWorkspace.tsx`：空白反馈、写作提示、模板插入和两种保存动作。
- `src/features/project-adjustment/ProjectAdjustmentWorkspace.tsx`：只读反馈与可编辑项目书双栏工作区。
- `src/features/project-adjustment/ProjectVersionConfirmation.tsx`：保存前差异、反馈来源和版本说明确认。
- `src/features/project-adjustment/projectDiff.ts`：生成供现有差异视图展示的内存行级差异。
- `src/features/history/HistoryWorkspace.tsx`：同时呈现关联反馈与项目书差异。
- `src/features/projects/overviewModel.ts`、`Overview.tsx`：提取并优先呈现目标、策略、下一步和最近活动。
- `src/lib/desktop.ts`：新增“提交关联反馈的项目书版本”前端边界。
- `src-tauri/src/lib.rs`：校验反馈路径、写入/读取 Git trailer，并返回关联路径。
- `src/components/layout/WorkspaceShell.tsx`、`src/styles.css`：接入新页面和可滚动双栏布局。

### Task 1: 调整会话的领域模型、状态与导航

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/stores/appStore.ts`
- Modify: `src/stores/appStore.test.ts`

**Interfaces:**
- Produces: `AppView` 新增 `project-adjustment`、`project-version-confirmation`。
- Produces: `ProjectAdjustmentDraft { feedbackPath, feedbackTitle, feedbackCreatedAt, feedbackContent, originalProjectContent, draftProjectContent, projectModifiedAt, versionNote, saveState }`，其中 `saveState` 为 `editing | file-saved-history-pending`。
- Produces: store actions `startProjectAdjustment(draft)`, `updateProjectAdjustment(patch)`, `clearProjectAdjustment()`。

- [ ] **Step 1: 写失败测试**：断言开始调整会保存完整草稿、更新只修改指定字段、切换/关闭项目会清理草稿。
- [ ] **Step 2: 运行测试确认红灯**：`corepack pnpm vitest run src/stores/appStore.test.ts`；预期因类型和 action 不存在而失败。
- [ ] **Step 3: 实现最小领域与状态代码**：新增上述精确类型/action；调整草稿不进入 Zustand 持久化白名单，并在项目根路径变化或关闭时清理。
- [ ] **Step 4: 运行测试**：同 Step 2；预期通过。

### Task 2: Git 中持久化“项目书版本关联反馈”

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/desktop.ts`
- Modify: `src/types/domain.ts`
- Test: `src-tauri/src/lib.rs` 内现有 `tests` 模块

**Interfaces:**
- Consumes: `feedbackPath` 为项目根目录下的安全相对路径。
- Produces: Tauri command `git_commit_project_version(project_root: String, summary: String, feedback_relative_path: String) -> Result<(), String>`。
- Produces: `desktopApi.gitCommitProjectVersion(projectRoot, summary, feedbackRelativePath): Promise<void>`。
- Produces: `GitCommit.relatedFeedbackPath?: string`。

- [ ] **Step 1: 写失败 Rust 测试**：覆盖空版本说明、绝对/越界/非 `feedback/*.md` 路径拒绝，合法提交正文含 `Learning-Machine-Feedback: feedback/...md`，历史解析返回关联路径。
- [ ] **Step 2: 运行测试确认红灯**：`cargo test --manifest-path src-tauri/Cargo.toml`；预期因命令和字段缺失而失败。
- [ ] **Step 3: 实现专用提交命令**：只暂存 `project.md`，subject 为 `plan: {summary}`，commit body 写入 trailer；保留现有通用提交行为供普通保存使用。
- [ ] **Step 4: 扩展历史解析**：Git log 格式加入 body，按限定分隔符安全解析；只接受合法 trailer，旧提交返回 `None`。
- [ ] **Step 5: 暴露前端接口与类型**：在 `desktopApi` 新增 invoke，映射 Rust 的 `related_feedback_path`。
- [ ] **Step 6: 运行验证**：`cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`、`cargo test --manifest-path src-tauri/Cargo.toml`、`corepack pnpm typecheck`；预期全部通过。

### Task 3: 开放式反馈编辑与两种保存动作

**Files:**
- Modify: `src/features/feedback/FeedbackWorkspace.tsx`
- Modify: `src/features/feedback/FeedbackWorkspace.test.tsx`
- Modify: `src/templates/feedbackTemplate.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Task 1 的 `startProjectAdjustment` 与导航 action。
- Produces: 空白 Markdown 编辑器、可展开写作提示、`插入完整复盘模板`、`保存反馈`、`保存并调整项目书`。

- [ ] **Step 1: 写失败交互测试**：新建反馈初始值为空；提示包含“实际发生了什么 / 哪些判断发生了变化 / 哪些内容值得保持 / 下一步想改变什么”；模板按钮插入完整模板且不覆盖已有文字。
- [ ] **Step 2: 写保存测试**：普通保存写真实反馈并返回列表；保存并调整只创建一次文件，准备反馈元数据后进入双栏页；写文件失败留在编辑器并显示错误。
- [ ] **Step 3: 运行测试确认红灯**：`corepack pnpm vitest run src/features/feedback/FeedbackWorkspace.test.tsx`。
- [ ] **Step 4: 实现最小交互**：移除默认模板和“请求调整”固定字段依赖；反馈正文可自由书写，提示不写入文件，模板只由用户主动插入。
- [ ] **Step 5: 处理部分成功**：若反馈文件已写入而后续 Git 提交失败，显示“反馈已保存，历史记录失败”，并允许继续调整且不再次创建文件。
- [ ] **Step 6: 运行测试与类型检查**：预期通过。

### Task 4: 反馈与项目书双栏调整工作区

**Files:**
- Create: `src/features/project-adjustment/ProjectAdjustmentWorkspace.tsx`
- Create: `src/features/project-adjustment/ProjectAdjustmentWorkspace.test.tsx`
- Modify: `src/components/layout/WorkspaceShell.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Task 1 的调整草稿；`desktopApi.readDocument(projectRoot, "project.md")` 返回内容与修改时间。
- Produces: 左侧只读反馈原文，右侧可编辑项目书；`下一步：查看差异` 更新草稿并进入确认页。

- [ ] **Step 1: 写失败测试**：左栏展示选定反馈且不可编辑，右栏载入当前 `project.md` 并可编辑；不出现固定原因标签、调整类型或自动建议。
- [ ] **Step 2: 增加异常测试**：调整草稿缺失时安全返回反馈列表；反馈缺失或项目书读取失败时显示可返回的错误态。
- [ ] **Step 3: 运行测试确认红灯**：`corepack pnpm vitest run src/features/project-adjustment/ProjectAdjustmentWorkspace.test.tsx`。
- [ ] **Step 4: 实现双栏工作区**：保留原始项目书内容和读取时 `modifiedAt`，编辑仅更新内存草稿；左右栏各自滚动，窄窗口改为纵向排列。
- [ ] **Step 5: 接入导航与返回行为**：返回反馈页不丢失已保存反馈；去确认页不写磁盘。
- [ ] **Step 6: 运行测试与类型检查**：预期通过。

### Task 5: 保存前项目书差异确认

**Files:**
- Create: `src/features/project-adjustment/projectDiff.ts`
- Create: `src/features/project-adjustment/projectDiff.test.ts`
- Create: `src/features/project-adjustment/ProjectVersionConfirmation.tsx`
- Create: `src/features/project-adjustment/ProjectVersionConfirmation.test.tsx`
- Modify: `src/components/layout/WorkspaceShell.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `buildProjectUnifiedDiff(before: string, after: string, path?: string): string`，供现有 `DiffViewer` 使用。
- Consumes: Task 2 的 `gitCommitProjectVersion` 与 Task 1 的调整草稿。

- [ ] **Step 1: 写失败差异测试**：覆盖新增、删除、替换、空文件和无变化；断言输出能被现有 diff parser 正确分类。
- [ ] **Step 2: 写失败页面测试**：展示关联反馈标题/时间、行级差异、默认说明“根据反馈调整项目书”；说明可编辑，无变化时确认按钮禁用。
- [ ] **Step 3: 写安全测试**：保存使用草稿中的 `projectModifiedAt`；外部修改冲突时不提交 Git、不清草稿；Git 提交失败时文件仍保存、状态变为 `file-saved-history-pending`，重试只执行 Git 提交而不重复写文件。
- [ ] **Step 4: 运行聚焦测试确认红灯**：运行两个新测试文件。
- [ ] **Step 5: 实现 LCS 行级差异生成**：只输出标准 unified diff 文本，不新增依赖；无变化返回空字符串。
- [ ] **Step 6: 实现确认页与保存顺序**：先校验说明和差异，再带修改时间写 `project.md`，随后调用关联提交；成功后清理草稿并进入历史页。若文件已保存但 Git 失败，禁用返回编辑，提供“重试记录历史”和“稍后处理并进入历史”，避免用旧时间戳重复覆盖。
- [ ] **Step 7: 运行聚焦测试、类型检查**：预期通过。

### Task 6: 历史页同时呈现“为什么改”和“改了什么”

**Files:**
- Modify: `src/features/history/HistoryWorkspace.tsx`
- Modify: `src/features/history/HistoryWorkspace.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `GitCommit.relatedFeedbackPath`、`desktopApi.readDocument`、现有 `gitDiff(projectRoot, commitHash, "project.md")`。
- Produces: 每个项目书版本的关联反馈只读区与项目书差异区。

- [ ] **Step 1: 写失败测试**：选择有关联版本时读取并展示反馈原文与 `project.md` diff；无关联的旧版本显示“未关联反馈”但仍显示差异。
- [ ] **Step 2: 写缺失文件测试**：关联反馈文件不存在时展示路径和缺失提示，差异仍成功渲染；读取失败不能让整页报错。
- [ ] **Step 3: 运行测试确认红灯**：`corepack pnpm vitest run src/features/history/HistoryWorkspace.test.tsx`。
- [ ] **Step 4: 实现组合详情视图**：版本列表仍只列项目书相关提交；详情区先解释“为什么改”，再显示“改了什么”，反馈文档只读。
- [ ] **Step 5: 处理竞态**：快速切换提交时忽略过期的反馈/diff 请求结果。
- [ ] **Step 6: 运行测试与类型检查**：预期通过。

### Task 7: 概览页改为行动导向的信息优先级

**Files:**
- Modify: `src/features/projects/overviewModel.ts`
- Modify: `src/features/projects/overviewModel.test.ts`
- Modify: `src/features/projects/Overview.tsx`
- Modify: `src/features/projects/Overview.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: 概览模型字段 `currentTarget`, `currentStrategy`, `nextStep`, `latestFeedback`, `latestProjectChange`, `recentFile`。

- [ ] **Step 1: 写失败模型测试**：从兼容的 Markdown 标题提取“当前阶段目标 / 当前学习策略 / 下一步”；缺少章节时返回清晰占位而非借用其他项目数据。
- [ ] **Step 2: 写失败页面测试**：按目标、策略、下一步、最近反馈、最近项目书变化、最近资料或笔记的顺序呈现；不再把倒计时作为核心信息。
- [ ] **Step 3: 运行测试确认红灯**：运行 overview 两个测试文件。
- [ ] **Step 4: 实现模型与布局**：沿用现有 Markdown 提取器，最近项目书变化来自 Git 项目书历史；新项目只显示自身文件计算出的空状态。
- [ ] **Step 5: 运行测试与类型检查**：预期通过。

### Task 8: 集成验证、兼容性与交付记录

**Files:**
- Modify: `feature_list.json`
- Modify: `progress.md`
- Modify: `session-handoff.md`
- Modify if behavior changed: `README.md`

**Interfaces:**
- Consumes: Tasks 1–7 的完整闭环。
- Produces: 可复验的自动化证据、人工验收清单和未合并的 V2 分支状态。

- [ ] **Step 1: 运行全部前端门禁**：`corepack pnpm typecheck`、`corepack pnpm test`、`corepack pnpm build`；记录测试数量与结果。
- [ ] **Step 2: 运行 Rust 门禁**：`cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`、`cargo test --manifest-path src-tauri/Cargo.toml`；记录结果。
- [ ] **Step 3: 运行 Harness 门禁**：`powershell -ExecutionPolicy Bypass -File .\init.ps1` 与 `git diff --check`；预期通过。
- [ ] **Step 4: 人工验证真实项目**：空白反馈→保存并调整→双栏修改→差异确认→历史查看；核对 `feedback/*.md`、`project.md` 和 Git trailer。
- [ ] **Step 5: 人工验证五个 Review Focus 场景**：模板追加、部分失败重试、外部修改冲突、Git 降级、反馈文件缺失。
- [ ] **Step 6: 更新状态文件**：只有全部门禁与人工验证完成后才把功能改为 `done`；保留在功能分支，向用户报告差异、证据和风险，不自行合并。
