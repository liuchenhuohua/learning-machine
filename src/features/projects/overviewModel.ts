import type { FeedbackDocument, GitCommit, ProjectFile } from "../../types/domain";

export type OverviewSnapshot = {
  latestFeedback: (FeedbackDocument & { content?: string }) | null;
  recentFile: ProjectFile | null;
  latestProjectChange: GitCommit | null;
};

type OverviewInput = {
  feedback: FeedbackDocument[];
  files: ProjectFile[];
  commits: GitCommit[];
  latestFeedbackContent?: string;
};

function flattenFiles(files: ProjectFile[]): ProjectFile[] {
  return files.flatMap(file => file.kind === "directory" ? flattenFiles(file.children ?? []) : [file]);
}

function toTimestamp(value?: string): number {
  if (!value) return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function createOverviewSnapshot({ feedback, files, commits, latestFeedbackContent }: OverviewInput): OverviewSnapshot {
  const latestFeedback = feedback[0] ? { ...feedback[0], content: latestFeedbackContent } : null;
  const recentFile = flattenFiles(files)
    .filter(file => file.path !== "project.md")
    .sort((a, b) => toTimestamp(b.modifiedAt) - toTimestamp(a.modifiedAt))[0] ?? null;
  const latestProjectChange = commits.find(commit => commit.kind === "project") ?? null;

  return { latestFeedback, recentFile, latestProjectChange };
}
