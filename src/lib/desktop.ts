import { invoke } from "@tauri-apps/api/core";
import type { DiskDocument, FeedbackDocument, GitChangedFile, GitCommit, LearningProject, ProjectFile } from "../types/domain";

const isTauri = () => "__TAURI_INTERNALS__" in window;

export const desktopApi = {
  isNative: isTauri,
  createProject: (input: { name: string; path: string; description?: string; targetDate?: string }) =>
    invoke<LearningProject>("create_project", { input }),
  openProject: (path: string) => invoke<LearningProject>("read_project", { path }),
  initializeExistingProject: (path: string) => invoke<LearningProject>("initialize_existing_project", { path }),
  pickProjectFolder: async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false });
    return typeof selected === "string" ? selected : null;
  },
  pickFiles: async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: false, multiple: true });
    return Array.isArray(selected) ? selected : selected ? [selected] : [];
  },
  readDocument: (projectRoot: string, relativePath: string) => invoke<DiskDocument>("read_document", { projectRoot, relativePath }),
  readBinaryDocument: (projectRoot: string, relativePath: string) => invoke<ArrayBuffer>("read_binary_document", { projectRoot, relativePath }),
  writeDocument: (projectRoot: string, relativePath: string, content: string, expectedModifiedAt?: string) =>
    invoke<DiskDocument>("write_document", { projectRoot, relativePath, content, expectedModifiedAt }),
  listFeedback: (projectRoot: string) => invoke<FeedbackDocument[]>("list_feedback", { projectRoot }),
  createFeedback: (projectRoot: string, content: string) => invoke<DiskDocument>("create_feedback", { projectRoot, content }),
  listFiles: (projectRoot: string) => invoke<ProjectFile[]>("list_project_files", { projectRoot }),
  createEntry: (projectRoot: string, relativePath: string, kind: "file" | "directory") => invoke<void>("create_entry", { projectRoot, relativePath, kind }),
  renameEntry: (projectRoot: string, relativePath: string, newName: string) => invoke<void>("rename_entry", { projectRoot, relativePath, newName }),
  moveEntry: (projectRoot: string, sourceRelativePath: string, destinationDirectory: string) => invoke<string>("move_entry", { projectRoot, sourceRelativePath, destinationDirectory }),
  deleteEntry: (projectRoot: string, relativePath: string) => invoke<void>("delete_entry", { projectRoot, relativePath }),
  importFile: (projectRoot: string, sourcePath: string, destinationDirectory: string) => invoke<void>("import_file", { projectRoot, sourcePath, destinationDirectory }),
  revealEntry: (projectRoot: string, relativePath: string) => invoke<void>("reveal_entry", { projectRoot, relativePath }),
  gitHistory: (projectRoot: string) => invoke<GitCommit[]>("git_history", { projectRoot }),
  gitCommitFiles: (projectRoot: string, hash: string) => invoke<GitChangedFile[]>("git_commit_files", { projectRoot, hash }),
  gitFileDiff: (projectRoot: string, hash: string, relativePath: string) => invoke<string>("git_file_diff", { projectRoot, hash, relativePath }),
  openProjectWindow: () => invoke<void>("open_project_window"),
  gitCommit: (projectRoot: string, message: string) => invoke<void>("git_commit", { projectRoot, message }),
  gitCommitProjectVersion: (projectRoot: string, summary: string, feedbackRelativePath: string) => invoke<void>("git_commit_project_version", { projectRoot, summary, feedbackRelativePath }),
  archiveProject: (projectRoot: string) => invoke<LearningProject>("archive_project", { projectRoot }),
  revealProject: (path: string) => invoke<void>("reveal_project", { path })
};

export function humanizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("EXTERNAL_MODIFICATION")) return "文件已被其他应用修改。请重新载入后再保存。";
  if (message.includes("NAME_CONFLICT")) return "目标位置已有同名文件，未进行覆盖。";
  if (message.includes("INVALID_MOVE")) return "不能把文件夹移动到自身或它的子文件夹中。";
  if (message.includes("MOVE_NOOP")) return "文件已经在这个文件夹中。";
  if (message.includes("PROTECTED_PATH")) return "materials 和 notes 根目录不能移动。";
  if (message.includes("GIT_UNAVAILABLE")) return "未检测到 Git，版本历史暂不可用。";
  return message || "操作没有完成，请稍后重试。";
}
