import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopApi } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import { FeedbackWorkspace } from "./FeedbackWorkspace";
import { appendFeedbackTemplate } from "../../templates/feedbackTemplate";

const project = {
  path: "D:/projects/current",
  name: "当前项目",
  createdAt: "2026-08-29T08:00:00+08:00",
  status: "active" as const
};

describe("FeedbackWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().openProject(project);
    vi.spyOn(desktopApi, "isNative").mockReturnValue(true);
  });

  it("returns to the feedback list and selects the saved document", async () => {
    const user = userEvent.setup();
    vi.spyOn(desktopApi, "createFeedback").mockResolvedValue({
      path: "feedback/2026-08-29-01.md",
      content: "# 学习反馈",
      modifiedAt: "1756425600000"
    });
    vi.spyOn(desktopApi, "gitCommit").mockResolvedValue(undefined);
    useAppStore.getState().navigate("feedback-editor");
    render(<FeedbackWorkspace editing />);

    await user.click(screen.getByRole("button", { name: "保存反馈" }));

    await waitFor(() => expect(useAppStore.getState().view).toBe("feedback"));
    expect(useAppStore.getState().selectedPath).toBe("feedback/2026-08-29-01.md");
  });

  it("starts with a blank editor and reveals optional writing prompts", async () => {
    const user = userEvent.setup();
    render(<FeedbackWorkspace editing />);

    expect(screen.getByRole("textbox")).toHaveTextContent("");
    expect(screen.queryByText("实际发生了什么")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "查看写作提示" }));
    expect(screen.getByText("实际发生了什么")).toBeInTheDocument();
    expect(screen.getByText("哪些判断发生了变化")).toBeInTheDocument();
    expect(screen.getByText("哪些内容值得保持")).toBeInTheDocument();
    expect(screen.getByText("下一步想改变什么")).toBeInTheDocument();
  });

  it("appends the full review template without replacing existing writing", () => {
    const result = appendFeedbackTemplate("今天先记录一个关键发现。", "2026-09-28");

    expect(result).toContain("今天先记录一个关键发现。\n\n# 学习反馈");
    expect(result).toContain("## 实际发生了什么");
  });

  it("saves feedback and opens a project adjustment draft", async () => {
    const user = userEvent.setup();
    vi.spyOn(desktopApi, "createFeedback").mockResolvedValue({
      path: "feedback/2026-09-28-01.md",
      content: "# 阶段复盘\n\n需要缩小范围。",
      modifiedAt: "1759010000000"
    });
    vi.spyOn(desktopApi, "gitCommit").mockRejectedValue(new Error("GIT_UNAVAILABLE"));
    vi.spyOn(desktopApi, "readDocument").mockResolvedValue({
      path: "project.md",
      content: "# 当前项目书",
      modifiedAt: "1759000000000"
    });
    render(<FeedbackWorkspace editing />);

    await user.click(screen.getByRole("button", { name: "插入完整复盘模板" }));
    await user.click(screen.getByRole("button", { name: "保存并调整项目书" }));

    await waitFor(() => expect(useAppStore.getState().view).toBe("project-adjustment"));
    expect(useAppStore.getState().projectAdjustment).toMatchObject({
      feedbackPath: "feedback/2026-09-28-01.md",
      feedbackTitle: "学习反馈",
      originalProjectContent: "# 当前项目书",
      draftProjectContent: "# 当前项目书",
      projectModifiedAt: "1759000000000",
      saveState: "editing"
    });
  });

  it("opens saved feedback read-only and supports deleting it", async () => {
    const user = userEvent.setup();
    vi.spyOn(desktopApi, "listFeedback").mockResolvedValue([{
      path: "feedback/2026-08-28-01.md",
      createdAt: "1756339200000",
      title: "一次真实复盘",
      requestsAdjustment: false
    }]);
    vi.spyOn(desktopApi, "readDocument").mockResolvedValue({
      path: "feedback/2026-08-28-01.md",
      content: "# 一次真实复盘\n\n这是本项目的反馈内容。",
      modifiedAt: "1756339200000"
    });
    const remove = vi.spyOn(desktopApi, "deleteEntry").mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<FeedbackWorkspace editing={false} />);

    expect(await screen.findByText("这是本项目的反馈内容。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "编辑" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除反馈" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith(project.path, "feedback/2026-08-28-01.md"));
  });
});
