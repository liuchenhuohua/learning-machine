import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { useAppStore } from "../stores/appStore";
import { desktopApi } from "../lib/desktop";

describe("Learning Machine workspace", () => {
  beforeEach(() => useAppStore.getState().reset());

  it("starts with project choices instead of an empty dashboard", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "选择一个学习项目" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /创建学习项目/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /打开已有项目/ })).toBeInTheDocument();
  });

  it("keeps feedback one click away throughout the project workspace", async () => {
    const user = userEvent.setup();
    useAppStore.getState().openProject({ path: "demo", name: "2027 考研", createdAt: "2026-08-29T08:00:00+08:00", status: "active" });
    render(<App />);
    const sidebar = screen.getByRole("navigation", { name: "项目导航" }).parentElement!;
    await user.click(within(sidebar).getByRole("button", { name: "记录反馈" }));
    expect(screen.getByRole("heading", { name: "新建学习反馈" })).toBeInTheDocument();
  });

  it("navigates to the project document from the desktop sidebar", async () => {
    const user = userEvent.setup();
    useAppStore.getState().openProject({ path: "demo", name: "2027 考研", createdAt: "2026-08-29T08:00:00+08:00", status: "active" });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "项目书" }));
    expect(screen.getByRole("heading", { name: "项目书" })).toBeInTheDocument();
  });

  it("opens a separate project chooser without closing the current project", async () => {
    const user = userEvent.setup();
    const api = desktopApi as typeof desktopApi & { openProjectWindow: () => Promise<void> };
    let finishOpening!: () => void;
    const openProjectWindow = vi.fn(() => new Promise<void>(resolve => { finishOpening = resolve; }));
    api.openProjectWindow = openProjectWindow;
    vi.spyOn(desktopApi, "isNative").mockReturnValue(true);
    useAppStore.getState().openProject({ path: "current", name: "当前项目", createdAt: "2026-08-30", status: "active" });
    render(<App />);

    const openButton = screen.getByRole("button", { name: "在新窗口打开项目" });
    await user.click(openButton);

    expect(openProjectWindow).toHaveBeenCalledOnce();
    expect(openButton).toBeDisabled();
    expect(useAppStore.getState().project?.name).toBe("当前项目");
    finishOpening();
  });
});
