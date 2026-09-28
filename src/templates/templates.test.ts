import { describe, expect, it } from "vitest";
import { createProjectTemplate } from "./projectTemplate";
import { createFeedbackTemplate, feedbackRequestsAdjustment } from "./feedbackTemplate";

describe("document templates", () => {
  it("puts the actual project name into a portable Markdown project document", () => {
    expect(createProjectTemplate("2027 考研")).toContain("# 2027 考研\n");
  });

  it("creates an optional open review template with a real date", () => {
    const result = createFeedbackTemplate("2026-08-29");
    expect(result).toContain("日期：2026-08-29");
    expect(result).toContain("## 实际发生了什么");
    expect(result).not.toContain("是否需要修改项目书");
  });

  it("recognizes only a checked project adjustment choice", () => {
    expect(feedbackRequestsAdjustment("- [x] 需要")).toBe(true);
    expect(feedbackRequestsAdjustment("- [ ] 需要")).toBe(false);
  });
});
