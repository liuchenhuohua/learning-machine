import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopApi } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import { HistoryWorkspace } from "./HistoryWorkspace";

const project = { path: "D:/projects/current", name: "当前项目", createdAt: "2026-08-30T08:00:00+08:00", status: "active" as const };

describe("HistoryWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().openProject(project);
    vi.spyOn(desktopApi, "isNative").mockReturnValue(true);
  });

  it("shows only project document revisions and loads the project.md diff", async () => {
    vi.spyOn(desktopApi, "gitHistory").mockResolvedValue([{
      hash: "a1234567890",
      message: "feedback: add learning feedback 2026-08-30-01",
      author: "Learning Machine",
      timestamp: "2026-08-30T09:00:00+08:00",
      kind: "feedback"
    }, {
      hash: "b1234567890",
      message: "plan: update project document",
      author: "Learning Machine",
      timestamp: "2026-08-30T10:00:00+08:00",
      kind: "project"
    }]);
    const gitFileDiff = vi.spyOn(desktopApi, "gitFileDiff").mockResolvedValue("@@ -1 +1 @@\n-# 旧项目书\n+# 新项目书");

    render(<HistoryWorkspace showDiff={false} />);

    expect(await screen.findByText(/新项目书/)).toBeInTheDocument();
    expect(screen.queryByText(/add learning feedback/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("修改的文件")).not.toBeInTheDocument();
    expect(screen.getByText("未关联反馈")).toBeInTheDocument();
    expect(gitFileDiff).toHaveBeenCalledWith(project.path, "b1234567890", "project.md");
  });

  it("shows why the project changed beside what changed", async () => {
    vi.spyOn(desktopApi, "gitHistory").mockResolvedValue([{
      hash: "c1234567890",
      message: "plan: 缩小下一阶段范围",
      author: "Learning Machine",
      timestamp: "2026-09-28T10:00:00+08:00",
      kind: "project",
      relatedFeedbackPath: "feedback/2026-09-28-01.md"
    }]);
    vi.spyOn(desktopApi, "gitFileDiff").mockResolvedValue("@@ -1 +1 @@\n-旧目标\n+新目标");
    const readDocument = vi.spyOn(desktopApi, "readDocument").mockResolvedValue({
      path: "feedback/2026-09-28-01.md",
      content: "# 阶段复盘\n\n现实证明原计划范围过大。",
      modifiedAt: "1759000000000"
    });

    render(<HistoryWorkspace showDiff={false} />);

    expect(await screen.findByText("为什么改")).toBeInTheDocument();
    expect(await screen.findByText("现实证明原计划范围过大。")).toBeInTheDocument();
    expect(screen.getByText("改了什么")).toBeInTheDocument();
    expect(await screen.findByText("新目标")).toBeInTheDocument();
    expect(readDocument).toHaveBeenCalledWith(project.path, "feedback/2026-09-28-01.md");
  });

  it("keeps the project diff visible when the related feedback file is missing", async () => {
    vi.spyOn(desktopApi, "gitHistory").mockResolvedValue([{
      hash: "d1234567890",
      message: "plan: 调整项目书",
      author: "Learning Machine",
      timestamp: "2026-09-28T10:00:00+08:00",
      kind: "project",
      relatedFeedbackPath: "feedback/missing.md"
    }]);
    vi.spyOn(desktopApi, "gitFileDiff").mockResolvedValue("@@ -1 +1 @@\n-旧内容\n+保留的项目书差异");
    vi.spyOn(desktopApi, "readDocument").mockRejectedValue(new Error("READ_FAILED"));

    render(<HistoryWorkspace showDiff={false} />);

    expect(await screen.findByText("关联反馈文件不可用")).toBeInTheDocument();
    expect(screen.getByText("feedback/missing.md")).toBeInTheDocument();
    expect(screen.getByText("保留的项目书差异")).toBeInTheDocument();
  });

  it("shows a real empty state instead of demo commits for a native project", async () => {
    vi.spyOn(desktopApi, "gitHistory").mockResolvedValue([]);
    render(<HistoryWorkspace showDiff={false} />);

    expect(await screen.findByText("还没有项目书历史")).toBeInTheDocument();
    expect(screen.queryByText("调整数学学习时间")).not.toBeInTheDocument();
  });
});
