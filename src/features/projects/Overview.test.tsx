import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopApi } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import { Overview } from "./Overview";

const project = { path: "D:/projects/current", name: "当前项目", createdAt: "2026-09-28", status: "active" as const };

describe("Overview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().openProject(project);
    vi.spyOn(desktopApi, "isNative").mockReturnValue(true);
  });

  it("uses one project-document review card before recent activity", async () => {
    const user = userEvent.setup();
    vi.spyOn(desktopApi, "readDocument").mockImplementation(async (_root, path) => path === "project.md" ? {
      path,
      content: "# 当前项目\n\n## 当前阶段目标\n完成概念复习。\n\n## 当前学习策略\n先复盘再学习新内容。\n\n## 下一步\n整理第一章错题。",
      modifiedAt: "1759000000000"
    } : { path, content: "# 最近反馈\n\n基础仍不稳。", modifiedAt: "1759010000000" });
    vi.spyOn(desktopApi, "listFeedback").mockResolvedValue([{ path: "feedback/review.md", createdAt: "1759010000000", title: "最近反馈" }]);
    vi.spyOn(desktopApi, "listFiles").mockResolvedValue([{ name: "笔记.md", path: "notes/笔记.md", kind: "file", modifiedAt: "1759020000000" }]);
    vi.spyOn(desktopApi, "gitHistory").mockResolvedValue([{ hash: "abc1234", message: "plan: 缩小范围", author: "Learning Machine", timestamp: "2026-09-28T10:00:00+08:00", kind: "project" }]);

    render(<Overview />);

    const reviewCard = await screen.findByRole("button", { name: /回顾当前项目书/ });
    expect(screen.getByText("重新阅读当前计划与假设，确认它是否仍符合实际情况。")).toBeInTheDocument();
    expect(screen.queryByText("当前阶段目标")).not.toBeInTheDocument();
    expect(screen.queryByText("当前学习策略")).not.toBeInTheDocument();
    expect(screen.queryByText("下一步")).not.toBeInTheDocument();
    expect(screen.getByText("最近反馈")).toBeInTheDocument();
    expect(screen.getByText("最近项目书变化")).toBeInTheDocument();
    expect(screen.getByText("继续最近资料或笔记")).toBeInTheDocument();
    expect(screen.queryByText(/距离目标/)).not.toBeInTheDocument();
    await user.click(reviewCard);
    expect(useAppStore.getState().view).toBe("project-document");
  });

  it("shows project-specific empty states without demo data", async () => {
    vi.spyOn(desktopApi, "readDocument").mockResolvedValue({ path: "project.md", content: "# 空项目", modifiedAt: "1759000000000" });
    vi.spyOn(desktopApi, "listFeedback").mockResolvedValue([]);
    vi.spyOn(desktopApi, "listFiles").mockResolvedValue([]);
    vi.spyOn(desktopApi, "gitHistory").mockResolvedValue([]);

    render(<Overview />);

    expect(await screen.findByRole("button", { name: /回顾当前项目书/ })).toBeInTheDocument();
    expect(screen.queryByText("建立稳定、可验证的学习节奏")).not.toBeInTheDocument();
  });
});
