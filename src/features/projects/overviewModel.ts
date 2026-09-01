import type { FeedbackDocument, GitCommit, LearningProject, ProjectFile } from "../../types/domain";

export type OverviewSnapshot = {
  target: string | null;
  daysRemaining: number | null;
  latestFeedback: (FeedbackDocument & { content?: string }) | null;
  recentFile: ProjectFile | null;
  latestAdjustment: GitCommit | null;
};

type OverviewInput = {
  project: LearningProject;
  projectMarkdown: string;
  feedback: FeedbackDocument[];
  files: ProjectFile[];
  commits: GitCommit[];
  latestFeedbackContent?: string;
  now?: Date;
};

const templatePrompts = new Set([
  "完成这个项目以后，我希望自己能够做到什么？",
  "我现在处于什么水平？"
]);

export function extractSection(markdown: string, heading: string): string | null {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex(line => line.trim() === `## ${heading}`);
  if (start < 0) return null;
  const endOffset = lines.slice(start + 1).findIndex(line => /^##\s+/.test(line.trim()));
  const sectionLines = endOffset < 0 ? lines.slice(start + 1) : lines.slice(start + 1, start + 1 + endOffset);
  const value = sectionLines
    .map(line => line.trim())
    .filter(Boolean)
    .join(" ");
  return value && !templatePrompts.has(value) ? value : null;
}

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

export function createOverviewSnapshot({ project, projectMarkdown, feedback, files, commits, latestFeedbackContent, now = new Date() }: OverviewInput): OverviewSnapshot {
  const target = extractSection(projectMarkdown, "目标状态") ?? extractSection(projectMarkdown, "当前阶段目标");
  const targetAt = project.targetDate ? new Date(`${project.targetDate}T00:00:00`) : null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysRemaining = targetAt && !Number.isNaN(targetAt.getTime())
    ? Math.max(0, Math.ceil((targetAt.getTime() - today.getTime()) / 86_400_000))
    : null;
  const latestFeedback = feedback[0] ? { ...feedback[0], content: latestFeedbackContent } : null;
  const recentFile = flattenFiles(files)
    .filter(file => file.path !== "project.md")
    .sort((a, b) => toTimestamp(b.modifiedAt) - toTimestamp(a.modifiedAt))[0] ?? null;
  const latestAdjustment = commits.find(commit => commit.kind === "project") ?? null;

  return { target, daysRemaining, latestFeedback, recentFile, latestAdjustment };
}
