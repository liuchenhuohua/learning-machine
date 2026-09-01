import { describe, expect, it } from "vitest";
import { createProjectTemplate } from "./projectTemplate";
import { createFeedbackTemplate, feedbackRequestsAdjustment } from "./feedbackTemplate";

describe("document templates", () => {
  it("puts the actual project name into a portable Markdown project document", () => {
    expect(createProjectTemplate("2027 考研")).toContain("# 2027 考研\n");
  });

  it("creates feedback with a real date and an unchecked adjustment choice", () => {
    const result = createFeedbackTemplate("2026-08-29");
    expect(result).toContain("日期：2026-08-29");
    expect(result).toContain("- [ ] 需要");
  });

  it("recognizes only a checked project adjustment choice", () => {
    expect(feedbackRequestsAdjustment("- [x] 需要")).toBe(true);
    expect(feedbackRequestsAdjustment("- [ ] 需要")).toBe(false);
  });
});
