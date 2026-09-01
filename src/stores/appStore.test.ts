import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./appStore";

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
});
