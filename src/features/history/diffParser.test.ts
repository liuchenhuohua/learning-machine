import { describe, expect, it } from "vitest";
import { buildSplitRows, parseUnifiedDiff } from "./diffParser";

describe("parseUnifiedDiff", () => {
  it("keeps old and new line numbers for a feedback file change", () => {
    const diff = `diff --git a/feedback/2026-08-30-01.md b/feedback/2026-08-30-01.md
new file mode 100644
--- /dev/null
+++ b/feedback/2026-08-30-01.md
@@ -0,0 +1,3 @@
+# 学习反馈
+
+今天完成了第一轮复盘。`;

    const parsed = parseUnifiedDiff(diff);

    expect(parsed.hunks).toHaveLength(1);
    expect(parsed.hunks[0].lines).toEqual([
      { kind: "addition", oldNumber: null, newNumber: 1, content: "# 学习反馈" },
      { kind: "addition", oldNumber: null, newNumber: 2, content: "" },
      { kind: "addition", oldNumber: null, newNumber: 3, content: "今天完成了第一轮复盘。" }
    ]);
    expect(parsed.additions).toBe(3);
    expect(parsed.deletions).toBe(0);
  });

  it("parses paired deletions and additions into split rows", () => {
    const parsed = parseUnifiedDiff(`@@ -2,2 +2,2 @@
-旧目标
-旧策略
+新目标
+新策略`);

    const rows = buildSplitRows(parsed.hunks[0].lines);

    expect(rows).toEqual([
      {
        left: { kind: "deletion", oldNumber: 2, newNumber: null, content: "旧目标" },
        right: { kind: "addition", oldNumber: null, newNumber: 2, content: "新目标" }
      },
      {
        left: { kind: "deletion", oldNumber: 3, newNumber: null, content: "旧策略" },
        right: { kind: "addition", oldNumber: null, newNumber: 3, content: "新策略" }
      }
    ]);
  });

  it("returns no hunks for an empty textual diff", () => {
    expect(parseUnifiedDiff("")).toEqual({ hunks: [], additions: 0, deletions: 0, raw: "" });
  });
});
