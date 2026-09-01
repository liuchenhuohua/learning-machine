import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownEditor } from "./MarkdownEditor";

describe("MarkdownEditor", () => {
  it("exposes a focusable scroll region when previewing a document", () => {
    render(<MarkdownEditor value={"# 标题\n\n" + "很长的内容\n\n".repeat(100)} onChange={() => undefined} preview />);

    const region = screen.getByRole("region", { name: "文档预览" });
    expect(region).toHaveAttribute("tabindex", "0");
  });
});
