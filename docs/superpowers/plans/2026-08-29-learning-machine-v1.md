# Learning Machine V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional local-first Tauri desktop MVP that completes the plan → feedback → adjustment → history learning loop.

**Architecture:** A typed React feature layer talks through a narrow `desktopApi` boundary to validated Tauri Rust commands. Learning files remain the source of truth; Zustand stores only UI/session state and recent paths.

**Tech Stack:** Tauri 2, Rust, React 19, TypeScript, Vite, Zustand, CodeMirror 6, react-markdown, remark-gfm, Lucide, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-29-learning-machine-v1-design.md`

## Global Constraints

- All learning data is stored as ordinary files inside the user-selected project root.
- No account, cloud, AI, calendar, task manager, or gamification features.
- No silent overwrite or delete; external modification and path escape are explicit errors.
- Git absence never blocks core project, document, feedback, or file features.
- UI copy is Simplified Chinese and optimized for a 1440×900 Windows desktop window.

---

### Task 1: Foundation and domain contracts

**Files:** Create Vite/Tauri configuration, `src/types/domain.ts`, `src/lib/desktop.ts`, `src/stores/appStore.ts`, `src/templates/*`, and matching tests.

**Interfaces:** Produce typed `desktopApi`, project/template types, and UI state actions consumed by every later task.

- [ ] Write failing tests for template output, feedback adjustment parsing, project status, and store navigation.
- [ ] Run focused Vitest tests and confirm failure because implementations are absent.
- [ ] Add the minimum domain, template, desktop adapter, and store implementation.
- [ ] Run focused tests and the TypeScript checker.

### Task 2: Launcher and workspace shell

**Files:** Create `src/app/App.tsx`, project feature screens, shared layout/components, and interaction tests.

**Interfaces:** Consume `desktopApi` and store; produce launcher, create/open flows, navigation shell, overview, theme switching, and project archive actions.

- [ ] Write failing interaction tests for launcher, project creation submission, navigation, and archive confirmation.
- [ ] Verify tests fail for missing screens.
- [ ] Implement accessible screens and responsive desktop shell.
- [ ] Run interaction tests and typecheck.

### Task 3: Project document and feedback loop

**Files:** Create Markdown editor/preview, project-document and feedback feature modules, styles, and tests.

**Interfaces:** Consume disk document commands; produce conflict-aware saves, dated feedback files, adjustment detection, and the “打开项目书” bridge.

- [ ] Write failing tests for edit/preview, save state, unique feedback names, and adjustment callout.
- [ ] Verify correct red failures.
- [ ] Implement editor and feedback flows with modular templates.
- [ ] Run tests, typecheck, and production frontend build.

### Task 4: Materials and notes workspace

**Files:** Create file tree, file toolbar/dialogs, preview/editor routing, and tests.

**Interfaces:** Consume safe file commands; produce create folder/Markdown, import, rename, confirmed delete, open/reveal, and refresh behavior.

- [ ] Write failing tests for tree rendering and each guarded mutation.
- [ ] Verify failures.
- [ ] Implement the file workspace and empty/error states.
- [ ] Run tests and build.

### Task 5: Tauri filesystem and project commands

**Files:** Create `src-tauri` configuration and Rust modules `commands/project.rs`, `commands/files.rs`, `security.rs`, and tests.

**Interfaces:** Produce Tauri commands used by `desktopApi`, including project create/read/init, document read/write with modification checks, tree and file mutations.

- [ ] Write Rust unit tests for path containment, conflict rejection, directory contract, metadata, and feedback filename allocation.
- [ ] Run Cargo tests and verify missing implementations fail when Cargo is available.
- [ ] Implement validated commands and structured errors.
- [ ] Run Cargo fmt, clippy, and tests when the Rust toolchain is available.

### Task 6: Git history and native integration

**Files:** Create Rust Git/dialog/shell commands, React history/diff screens, parsing and interaction tests.

**Interfaces:** Produce Git detection/init/commit/log/diff plus native select/import/reveal operations; degrade gracefully without Git.

- [ ] Write failing TypeScript and Rust tests for friendly history mapping, diff display, and Git-unavailable behavior.
- [ ] Verify red failures.
- [ ] Implement Git CLI and native integrations without exposing advanced Git concepts.
- [ ] Run all available tests and builds.

### Task 7: Refinement and acceptance

**Files:** Refine global CSS, error/toast/dialog components, README, and acceptance test fixtures.

**Interfaces:** Produce complete light/dark/system UI, keyboard and focus behavior, setup documentation, and a repeatable acceptance checklist.

- [ ] Add failing accessibility and error-recovery interaction tests.
- [ ] Implement remaining states and visual polish.
- [ ] Run full Vitest suite, typecheck, frontend production build, and Rust/Tauri checks when available.
- [ ] Inspect the rendered application at 1440×900 and fix visible layout defects.

