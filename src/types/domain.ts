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
  relatedFeedbackPath?: string;
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

export type ProjectAdjustmentDraft = {
  feedbackPath: string;
  feedbackTitle: string;
  feedbackCreatedAt: string;
  feedbackContent: string;
  originalProjectContent: string;
  draftProjectContent: string;
  projectModifiedAt: string;
  versionNote: string;
  saveState: "editing" | "file-saved-history-pending";
};

export type AppView = "launcher" | "create-project" | "overview" | "project-document" | "project-adjustment" | "project-version-confirmation" | "feedback" | "feedback-editor" | "files" | "markdown-editor" | "history" | "diff";
