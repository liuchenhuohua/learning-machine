export type ProjectStatus = "active" | "archived";

export type LearningProject = {
  path: string;
  name: string;
  description?: string;
  createdAt: string;
  status: ProjectStatus;
  targetDate?: string;
};

export type FeedbackDocument = {
  path: string;
  createdAt: string;
  title?: string;
  requestsAdjustment?: boolean;
};

export type ProjectFile = {
  name: string;
  path: string;
  kind: "file" | "directory";
  extension?: string;
  modifiedAt?: string;
  children?: ProjectFile[];
};

export type GitCommit = {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  kind: "project" | "feedback" | "file" | "system";
};

export type GitChangedFile = {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  oldPath?: string;
};

export type DiskDocument = {
  path: string;
  content: string;
  modifiedAt: string;
};

export type AppView = "launcher" | "create-project" | "overview" | "project-document" | "feedback" | "feedback-editor" | "files" | "markdown-editor" | "history" | "diff";
