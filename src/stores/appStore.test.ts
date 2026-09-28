import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./appStore";

const adjustmentDraft = {
  feedbackPath: "feedback/2026-09-28-review.md",
  feedbackTitle: "阶段复盘",
  feedbackCreatedAt: "2026-09-28T10:00:00+08:00",
  feedbackContent: "这次练习暴露了概念理解问题。",
  originalProjectContent: "# 项目书\n\n## 当前阶段目标\n完成第一轮学习",
  draftProjectContent: "# 项目书\n\n## 当前阶段目标\n重新梳理核心概念",
  projectModifiedAt: "2026-09-28T09:00:00+08:00",
  versionNote: "根据阶段复盘调整目标",
  saveState: "editing" as const
};

describe("app store", () => {
  beforeEach(() => useAppStore.getState().reset());

  it("opens a project on its overview without replacing disk-backed content", () => {
    useAppStore.getState().openProject({
      path: "D:\\Learning\\2027考研",
      name: "2027考研",
      description: "应用心理学",
      createdAt: "2026-08-29T08:00:00+08:00",
      status: "active"
    });
    expect(useAppStore.getState().view).toBe("overview");
    expect(useAppStore.getState().project?.name).toBe("2027考研");
  });

  it("returns to launcher and clears the transient project session", () => {
    useAppStore.setState({ view: "feedback", project: { path: "x", name: "x", createdAt: "x", status: "active" } });
    useAppStore.getState().closeProject();
    expect(useAppStore.getState().project).toBeNull();
    expect(useAppStore.getState().view).toBe("launcher");
  });

  it("remembers a recently opened project path without duplicating it", () => {
    const project = { path: "D:\\Learning\\2027考研", name: "2027考研", createdAt: "2026-08-29", status: "active" as const };
    useAppStore.getState().openProject(project);
    useAppStore.getState().openProject(project);
    expect(useAppStore.getState().recentProjects).toEqual([project]);
  });

  it("keeps a complete project adjustment draft while the project is open", () => {
    useAppStore.getState().startProjectAdjustment(adjustmentDraft);

    expect(useAppStore.getState().projectAdjustment).toEqual(adjustmentDraft);
    expect(useAppStore.getState().view).toBe("project-adjustment");
  });

  it("updates only the edited fields of the current adjustment draft", () => {
    useAppStore.getState().startProjectAdjustment(adjustmentDraft);
    useAppStore.getState().updateProjectAdjustment({
      draftProjectContent: "更新后的项目书",
      versionNote: "缩小下一阶段范围"
    });

    expect(useAppStore.getState().projectAdjustment).toEqual({
      ...adjustmentDraft,
      draftProjectContent: "更新后的项目书",
      versionNote: "缩小下一阶段范围"
    });
  });

  it("clears the adjustment draft when another project is opened or the project is closed", () => {
    useAppStore.getState().startProjectAdjustment(adjustmentDraft);
    useAppStore.getState().openProject({ path: "next", name: "next", createdAt: "now", status: "active" });
    expect(useAppStore.getState().projectAdjustment).toBeNull();

    useAppStore.getState().startProjectAdjustment(adjustmentDraft);
    useAppStore.getState().closeProject();
    expect(useAppStore.getState().projectAdjustment).toBeNull();
  });
});
