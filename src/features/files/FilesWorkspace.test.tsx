import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopApi } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import type { ProjectFile } from "../../types/domain";
import { FilesWorkspace } from "./FilesWorkspace";

const project = { path: "D:/projects/current", name: "当前项目", createdAt: "2026-08-30T08:00:00+08:00", status: "active" as const };
const files: ProjectFile[] = [
  { name: "materials", path: "materials", kind: "directory", children: [
    { name: "课程", path: "materials/课程", kind: "directory", children: [
      { name: "讲义.pdf", path: "materials/课程/讲义.pdf", kind: "file", extension: "pdf" }
    ] }
  ] },
  { name: "notes", path: "notes", kind: "directory", children: [
    { name: "英语", path: "notes/英语", kind: "directory", children: [] }
  ] }
];

describe("FilesWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().openProject(project);
    vi.spyOn(desktopApi, "isNative").mockReturnValue(true);
    vi.spyOn(desktopApi, "listFiles").mockResolvedValue(files);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:pdf-reader") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  it("starts a native project without a fictional markdown document", async () => {
    render(<FilesWorkspace />);

    expect(await screen.findByText("选择一个文件或文件夹")).toBeInTheDocument();
    expect(screen.queryByText(/阅读理解复盘/)).not.toBeInTheDocument();
  });

  it("creates markdown inside the selected nested folder", async () => {
    const user = userEvent.setup();
    const createEntry = vi.spyOn(desktopApi, "createEntry").mockResolvedValue(undefined);
    vi.spyOn(desktopApi, "readDocument").mockResolvedValue({ path: "materials/课程/新笔记.md", content: "", modifiedAt: "1" });
    vi.spyOn(window, "prompt").mockReturnValue("新笔记");
    render(<FilesWorkspace />);

    await user.click(await screen.findByRole("button", { name: "课程" }));
    await user.click(screen.getByTitle("新建 Markdown"));

    expect(createEntry).toHaveBeenCalledWith(project.path, "materials/课程/新笔记.md", "file");
  });

  it("creates a folder beside the selected file", async () => {
    const user = userEvent.setup();
    const createEntry = vi.spyOn(desktopApi, "createEntry").mockResolvedValue(undefined);
    const api = desktopApi as typeof desktopApi & { readBinaryDocument: (root: string, path: string) => Promise<ArrayBuffer> };
    api.readBinaryDocument = vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70]).buffer);
    vi.spyOn(window, "prompt").mockReturnValue("习题");
    render(<FilesWorkspace />);

    await user.click(await screen.findByRole("button", { name: "讲义.pdf" }));
    await user.click(screen.getByTitle("新建文件夹"));

    expect(createEntry).toHaveBeenCalledWith(project.path, "materials/课程/习题", "directory");
  });

  it("opens a selected PDF in the built-in reader", async () => {
    const user = userEvent.setup();
    const api = desktopApi as typeof desktopApi & { readBinaryDocument: (root: string, path: string) => Promise<ArrayBuffer> };
    api.readBinaryDocument = vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70]).buffer);
    render(<FilesWorkspace />);

    await user.click(await screen.findByRole("button", { name: "讲义.pdf" }));

    expect(await screen.findByTitle("PDF 阅读器")).toHaveAttribute("src", "blob:pdf-reader");
  });
});
