# Learning Machine V1 Design

## Product goal

Learning Machine is a Windows-first, local-first desktop workspace for short learning feedback loops. A learning project is a real user-selected folder. The application helps a learner compare plans with reality, record feedback, revise `project.md`, and understand those revisions through a human-readable Git timeline.

## Scope

V1 includes the project launcher, project creation/opening, overview, project document, feedback, materials and notes, Markdown editing/preview, Git history/diff, archive state, light/dark/system themes, and user-facing error states. It excludes accounts, sync, collaboration, AI, task/calendar systems, gamification, mobile, and web deployment.

## Architecture

- Tauri 2 is the desktop shell. Rust commands own privileged filesystem, native dialog, shell-open, and Git CLI operations.
- React 19 + TypeScript + Vite render the workspace. Zustand holds transient UI and project session state; learning content is never stored in the webview state as its source of truth.
- Every privileged command accepts a project root and validates that the resolved target remains inside that root. Destructive file actions require confirmation in React and are rejected by Rust when paths escape the root.
- Recent project paths and theme preference use Tauri Store. Project metadata lives in `.learning-machine/project.json`; project content remains ordinary files.

## Project folder contract

```text
project-root/
├── project.md
├── feedback/
├── materials/
├── notes/
├── archive/
└── .learning-machine/project.json
```

Creation refuses silent overwrite. Opening a recognized project reloads metadata and content from disk. An unrecognized folder may be initialized without deleting existing content. Missing or malformed paths produce actionable errors.

## Domain model

`LearningProject` contains path, name, description, createdAt, status, and optional targetDate. `FeedbackDocument` contains relative path, createdAt, title, and whether the document requests a project revision. `ProjectFile` represents the safe relative file tree. `GitCommit` contains hash, message, author, timestamp, and change kind.

## Feature boundaries

- `features/projects`: launcher, creation/opening, overview, archive, recent paths.
- `features/project-document`: disk-backed `project.md` reading, preview, editing, conflict-aware saving, optional version message.
- `features/feedback`: date-sequenced filenames, modular feedback template, list/editor, project-adjustment prompt.
- `features/files`: `materials/` and `notes/` tree, Markdown creation, folders, import, rename, delete, reveal/open.
- `features/history`: Git availability, initialization, commits, friendly timeline, `project.md` diff.
- `components/editor`: CodeMirror editing, GFM preview, formatting toolbar, unsaved-change protection.

## Data flow

Opening a project invokes `read_project`, then refreshes current disk state. Editors retain a baseline modification timestamp; saving sends that timestamp so external edits can be detected rather than overwritten silently. Important saves may invoke a separate Git commit command. File tree and feedback lists refresh after mutations.

## Errors and degraded operation

Rust errors use stable codes mapped to Chinese UI messages. Git absence disables only history/version actions. Missing `project.md` offers recreation. Permission, name conflict, malformed config, external modification, missing folder, invalid path, and Git command errors appear in the UI with a recovery action.

## UX direction

The 1440×900 desktop layout uses a compact 248px sidebar, a restrained warm-neutral canvas, crisp cards, and an ink/teal accent. A global “记录反馈” action remains visible. The launcher is calm and sparse; the workspace prioritizes content density over dashboard decoration. Light mode is primary, with complete dark and system modes.

## Testing

- Vitest tests pure domain rules, templates, store transitions, safe relative-path handling in the frontend, and key React flows.
- Rust tests project creation conflict behavior, path containment, metadata parsing, feedback filename allocation, and Git-output parsing.
- Acceptance checks cover creating real files, reopening, refreshing external edits, writing feedback, viewing commits/diff, and archiving without deletion.

## Milestones

1. Tauri shell, launcher, project creation/opening, directory contract, metadata.
2. Disk-backed `project.md` editor and preview.
3. Feedback list/editor and project-adjustment bridge.
4. Materials/notes file workspace.
5. Git detection, initialization, commit history, and diff.
6. visual refinement, keyboard interaction, error states, themes, accessibility, and acceptance verification.

## Environment note

The current workstation has Node.js and Git but no discoverable Rust/Cargo toolchain. Frontend tests and production web assets can be verified now. Native Tauri compilation requires installing the Rust stable MSVC toolchain and Windows build prerequisites.
