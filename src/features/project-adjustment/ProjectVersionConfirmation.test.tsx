import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopApi } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import type { ProjectAdjustmentDraft } from "../../types/domain";
import { ProjectVersionConfirmation } from "./ProjectVersionConfirmation";

const project = { path: "D:/projects/current", name: "当前项目", createdAt: "2026-09-28", status: "active" as const };
const draft: ProjectAdjustmentDraft = {
  feedbackPath: "feedback/2026-09-28-01.md",
  feedbackTitle: "阶段复盘",
  feedbackCreatedAt: "2026-09-28T10:00:00+08:00",
  feedbackContent: "# 阶段复盘",
  originalProjectContent: "# 项目书\n\n旧目标",
  draftProjectContent: "# 项目书\n\n新目标",
  projectModifiedAt: "1759000000000",
  versionNote: "根据反馈调整项目书",
  saveState: "editing"
};

describe("ProjectVersionConfirmation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().openProject(project);
    useAppStore.getState().startProjectAdjustment(draft);
  });

  it("shows the related feedback, editable version note, and line diff", () => {
    render(<ProjectVersionConfirmation />);

    expect(screen.getByText("阶段复盘")).toBeInTheDocument();
    expect(screen.getByLabelText("版本说明")).toHaveValue("根据反馈调整项目书");
    expect(screen.getByText("旧目标")).toBeInTheDocument();
    expect(screen.getByText("新目标")).toBeInTheDocument();
  });

  it("returns to the dual-pane editor without discarding changes", async () => {
    const user = userEvent.setup();
    render(<ProjectVersionConfirmation />);
    await user.click(screen.getByRole("button", { name: "返回继续修改" }));

    expect(useAppStore.getState().view).toBe("project-adjustment");
    expect(useAppStore.getState().projectAdjustment?.draftProjectContent).toContain("新目标");
  });

  it("writes with conflict protection and records the related feedback", async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(desktopApi, "writeDocument").mockResolvedValue({ path: "project.md", content: draft.draftProjectContent, modifiedAt: "1759010000000" });
    const commit = vi.spyOn(desktopApi, "gitCommitProjectVersion").mockResolvedValue(undefined);
    render(<ProjectVersionConfirmation />);

    await user.clear(screen.getByLabelText("版本说明"));
    await user.type(screen.getByLabelText("版本说明"), "缩小下一阶段范围");
    await user.click(screen.getByRole("button", { name: "确认保存新版本" }));

    await waitFor(() => expect(useAppStore.getState().view).toBe("history"));
    expect(write).toHaveBeenCalledWith(project.path, "project.md", draft.draftProjectContent, draft.projectModifiedAt);
    expect(commit).toHaveBeenCalledWith(project.path, "缩小下一阶段范围", draft.feedbackPath);
    expect(useAppStore.getState().projectAdjustment).toBeNull();
  });

  it("keeps the draft when the project file changed externally", async () => {
    const user = userEvent.setup();
    vi.spyOn(desktopApi, "writeDocument").mockRejectedValue(new Error("EXTERNAL_MODIFICATION"));
    const commit = vi.spyOn(desktopApi, "gitCommitProjectVersion").mockResolvedValue(undefined);
    render(<ProjectVersionConfirmation />);

    await user.click(screen.getByRole("button", { name: "确认保存新版本" }));

    expect(await screen.findByText("文件已被其他应用修改。请重新载入后再保存。")).toBeInTheDocument();
    expect(commit).not.toHaveBeenCalled();
    expect(useAppStore.getState().projectAdjustment).not.toBeNull();
  });

  it("retries only Git history after the file was saved successfully", async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(desktopApi, "writeDocument").mockResolvedValue({ path: "project.md", content: draft.draftProjectContent, modifiedAt: "1759010000000" });
    const commit = vi.spyOn(desktopApi, "gitCommitProjectVersion").mockRejectedValueOnce(new Error("GIT_UNAVAILABLE")).mockResolvedValueOnce(undefined);
    render(<ProjectVersionConfirmation />);

    await user.click(screen.getByRole("button", { name: "确认保存新版本" }));
    expect(await screen.findByText("项目书已保存，但版本历史尚未记录。")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重试记录历史" }));

    await waitFor(() => expect(useAppStore.getState().view).toBe("history"));
    expect(write).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledTimes(2);
  });
});
