import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopApi } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import { ProjectDocument } from "./ProjectDocument";

describe("ProjectDocument templates", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().openProject({ path: "D:/projects/current", name: "当前项目", createdAt: "2026-09-28", status: "active" });
    vi.spyOn(desktopApi, "isNative").mockReturnValue(true);
    vi.spyOn(desktopApi, "readDocument").mockResolvedValue({ path: "project.md", content: "# 当前项目\n\n已有内容", modifiedAt: "1759010000000" });
  });

  it("appends a local Markdown template and reports its copied project path", async () => {
    const user = userEvent.setup();
    vi.spyOn(desktopApi, "pickMarkdownTemplate").mockResolvedValue("C:/templates/project.md");
    vi.spyOn(desktopApi, "importMarkdownTemplate").mockResolvedValue({ path: "materials/templates/project.md", content: "## 当前阶段目标\n\n填写目标", modifiedAt: "1759010001000" });
    render(<ProjectDocument />);

    await screen.findByText("已有内容");
    await user.click(screen.getByRole("button", { name: "编辑项目书" }));
    await user.click(screen.getByRole("button", { name: "插入模板" }));

    expect(screen.getByRole("textbox")).toHaveTextContent("已有内容");
    expect(screen.getByRole("textbox")).toHaveTextContent("当前阶段目标");
    expect(screen.getByText("模板已复制到 materials/templates/project.md")).toBeInTheDocument();
  });
});
