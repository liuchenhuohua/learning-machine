import { describe, expect, it } from "vitest";
import { createOverviewSnapshot } from "./overviewModel";
describe("createOverviewSnapshot", () => {
  it("uses empty states for a new project instead of demo project data", () => {
    const snapshot = createOverviewSnapshot({
      feedback: [],
      files: [],
      commits: []
    });

    expect(snapshot.latestFeedback).toBeNull();
    expect(snapshot.recentFile).toBeNull();
    expect(snapshot.latestProjectChange).toBeNull();
  });

  it("derives recent activity without assuming project document sections", () => {
    const snapshot = createOverviewSnapshot({
      feedback: [{ path: "feedback/latest.md", createdAt: "200", title: "最新反馈" }],
      files: [{ name: "note.md", path: "notes/note.md", kind: "file", modifiedAt: "300" }],
      commits: [{ hash: "abc1234", message: "plan: update", author: "Learning Machine", timestamp: "100", kind: "project" }],
      latestFeedbackContent: "反馈正文"
    });

    expect(snapshot.latestFeedback?.content).toBe("反馈正文");
    expect(snapshot.recentFile?.path).toBe("notes/note.md");
    expect(snapshot.latestProjectChange?.hash).toBe("abc1234");
  });
});
