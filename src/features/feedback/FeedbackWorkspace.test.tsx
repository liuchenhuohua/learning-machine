import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopApi } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import { FeedbackWorkspace } from "./FeedbackWorkspace";

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
