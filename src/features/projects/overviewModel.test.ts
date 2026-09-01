import { describe, expect, it } from "vitest";
import { createOverviewSnapshot } from "./overviewModel";
import type { LearningProject } from "../../types/domain";

const project: LearningProject = {
  path: "D:/projects/new-project",
  name: "新项目",
  description: "这个项目自己的说明",
  createdAt: "2026-08-29T08:00:00+08:00",
  status: "active"
};

describe("createOverviewSnapshot", () => {
  it("uses empty states for a new project instead of demo project data", () => {
    const snapshot = createOverviewSnapshot({
      project,
      projectMarkdown: "# 新项目\n\n## 目标状态\n\n完成这个项目以后，我希望自己能够做到什么？\n",
      feedback: [],
      files: [],
      commits: [],
      now: new Date("2026-08-29T08:00:00+08:00")
    });

    expect(snapshot.target).toBeNull();
    expect(snapshot.daysRemaining).toBeNull();
    expect(snapshot.latestFeedback).toBeNull();
    expect(snapshot.recentFile).toBeNull();
    expect(snapshot.latestAdjustment).toBeNull();
  });

  it("derives the goal and countdown from the current project", () => {
    const snapshot = createOverviewSnapshot({
      project: { ...project, targetDate: "2026-09-08" },
      projectMarkdown: "# 新项目\n\n## 目标状态\n\n能够独立完成一篇英文长文精读。\n\n## 下一步\n\n开始第一篇。",
      feedback: [],
      files: [],
      commits: [],
      now: new Date("2026-08-29T00:00:00+08:00")
    });

    expect(snapshot.target).toBe("能够独立完成一篇英文长文精读。");
    expect(snapshot.daysRemaining).toBe(10);
  });

  it("reads a goal section when it is the final section in the project document", () => {
    const snapshot = createOverviewSnapshot({
      project,
      projectMarkdown: "# 新项目\n\n## 当前阶段目标\n\n完成第一轮复习。\n",
      feedback: [],
      files: [],
      commits: []
    });

    expect(snapshot.target).toBe("完成第一轮复习。");
  });
});
