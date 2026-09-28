import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "../history/diffParser";
import { buildProjectUnifiedDiff } from "./projectDiff";

describe("buildProjectUnifiedDiff", () => {
  it("builds a line-level replacement diff that the history viewer can parse", () => {
    const raw = buildProjectUnifiedDiff("# 项目书\n\n旧目标", "# 项目书\n\n新目标");
    const parsed = parseUnifiedDiff(raw);

    expect(parsed.additions).toBe(1);
    expect(parsed.deletions).toBe(1);
    expect(parsed.hunks[0].lines).toEqual([
      { kind: "context", oldNumber: 1, newNumber: 1, content: "# 项目书" },
      { kind: "context", oldNumber: 2, newNumber: 2, content: "" },
      { kind: "deletion", oldNumber: 3, newNumber: null, content: "旧目标" },
      { kind: "addition", oldNumber: null, newNumber: 3, content: "新目标" }
    ]);
  });

  it("handles content added to or removed from an empty document", () => {
    expect(parseUnifiedDiff(buildProjectUnifiedDiff("", "第一行")).additions).toBe(1);
    expect(parseUnifiedDiff(buildProjectUnifiedDiff("第一行", "")).deletions).toBe(1);
  });

  it("returns an empty diff when the project document did not change", () => {
    expect(buildProjectUnifiedDiff("相同内容", "相同内容")).toBe("");
  });
});
