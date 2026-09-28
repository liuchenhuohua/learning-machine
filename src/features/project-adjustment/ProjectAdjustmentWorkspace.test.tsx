import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../../stores/appStore";
import type { ProjectAdjustmentDraft } from "../../types/domain";
import { ProjectAdjustmentWorkspace } from "./ProjectAdjustmentWorkspace";

const draft: ProjectAdjustmentDraft = {
  feedbackPath: "feedback/2026-09-28-01.md",
  feedbackTitle: "阶段复盘",
  feedbackCreatedAt: "2026-09-28T10:00:00+08:00",
  feedbackContent: "# 阶段复盘\n\n现实中需要减少新内容。",
  originalProjectContent: "# 项目书\n\n## 当前阶段目标\n完成两章",
  draftProjectContent: "# 项目书\n\n## 当前阶段目标\n完成两章",
  projectModifiedAt: "1759000000000",
  versionNote: "根据反馈调整项目书",
  saveState: "editing"
};

describe("ProjectAdjustmentWorkspace", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().startProjectAdjustment(draft);
  });

  it("shows the original feedback read-only beside an editable project document", () => {
    render(<ProjectAdjustmentWorkspace />);

    expect(screen.getByRole("heading", { name: "阶段复盘", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("现实中需要减少新内容。")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "本次反馈（只读）" })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveTextContent("当前阶段目标");
    expect(screen.getByText("反馈是现实证据，项目书是当前假设；由你决定修改哪些部分。")).toBeInTheDocument();
    expect(screen.queryByText("偏差原因")).not.toBeInTheDocument();
    expect(screen.queryByText("自动建议")).not.toBeInTheDocument();
    const editablePane = screen.getByRole("region", { name: "当前项目书（可编辑）" });
    expect(editablePane.querySelector(".adjustment-pane-body")).toHaveClass("editor-scroll-host");
  });

  it("keeps the draft and opens version confirmation", async () => {
    const user = userEvent.setup();
    render(<ProjectAdjustmentWorkspace />);
    useAppStore.getState().updateProjectAdjustment({ draftProjectContent: "# 项目书\n\n调整后的目标" });

    await user.click(screen.getByRole("button", { name: "查看修改差异" }));

    expect(useAppStore.getState().view).toBe("project-version-confirmation");
    expect(useAppStore.getState().projectAdjustment?.draftProjectContent).toContain("调整后的目标");
  });

  it("returns to feedback without discarding the adjustment draft", async () => {
    const user = userEvent.setup();
    render(<ProjectAdjustmentWorkspace />);

    await user.click(screen.getByRole("button", { name: "返回反馈" }));

    expect(useAppStore.getState().view).toBe("feedback");
    expect(useAppStore.getState().projectAdjustment).toEqual(draft);
  });

  it("shows a safe recovery action when the adjustment draft is missing", async () => {
    const user = userEvent.setup();
    useAppStore.getState().clearProjectAdjustment();
    render(<ProjectAdjustmentWorkspace />);

    expect(screen.getByText("没有可继续的项目书调整")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "返回反馈列表" }));
    expect(useAppStore.getState().view).toBe("feedback");
  });
});
