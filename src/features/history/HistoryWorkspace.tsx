import { GitCommitHorizontal, GitCompareArrows, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { desktopApi, humanizeError } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import type { GitChangedFile, GitCommit } from "../../types/domain";
import { DiffViewer } from "./DiffViewer";
import { MarkdownEditor } from "../../components/editor/MarkdownEditor";

const demoCommits: GitCommit[] = [
  { hash: "demo-plan", message: "plan: 调整数学学习时间", kind: "project", author: "Learning Machine", timestamp: "2026-08-29T22:41:00+08:00", relatedFeedbackPath: "feedback/demo.md" },
  { hash: "demo-initial", message: "chore: initialize learning project", kind: "system", author: "Learning Machine", timestamp: "2026-08-20T20:00:00+08:00" }
];
const projectDocument: GitChangedFile = { path: "project.md", status: "modified" };
const demoDiff = "@@ -6,3 +6,4 @@\n ## 当前学习策略\n-每天完成两讲数学课程。\n+每天完成一讲数学课程。\n+晚间增加 30 分钟错题复盘。";

export function HistoryWorkspace({ showDiff: _showDiff }: { showDiff: boolean }) {
  const project = useAppStore(state => state.project);
  const native = desktopApi.isNative();
  const [commits, setCommits] = useState<GitCommit[]>(native ? [] : demoCommits);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(native ? null : demoCommits[0]);
  const [rawDiff, setRawDiff] = useState(native ? "" : demoDiff);
  const [loading, setLoading] = useState(native);
  const [error, setError] = useState("");
  const [feedbackReason, setFeedbackReason] = useState<{ status: "none" | "loading" | "ready" | "missing"; content: string; path?: string }>(native ? { status: "none", content: "" } : { status: "ready", content: "# 数学进度与错题复盘\n\n实际进度比计划慢，需要降低每日新内容并增加错题复习。", path: "feedback/demo.md" });

  useEffect(() => {
    if (!project || !native) return;
    let cancelled = false;
    setCommits([]); setSelectedCommit(null); setRawDiff(""); setFeedbackReason({ status: "none", content: "" }); setLoading(true); setError("");
    desktopApi.gitHistory(project.path).then(items => {
      if (cancelled) return;
      const projectCommits = items.filter(item => item.kind === "project" || item.kind === "system");
      setCommits(projectCommits);
      setSelectedCommit(projectCommits[0] ?? null);
    }).catch(cause => { if (!cancelled) setError(humanizeError(cause)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [project?.path, native]);

  useEffect(() => {
    if (!project || !native || !selectedCommit) return;
    let cancelled = false;
    setRawDiff(""); setError("");
    const feedbackPath = selectedCommit.relatedFeedbackPath;
    setFeedbackReason(feedbackPath ? { status: "loading", content: "", path: feedbackPath } : { status: "none", content: "" });
    desktopApi.gitFileDiff(project.path, selectedCommit.hash, "project.md").then(value => {
      if (!cancelled) setRawDiff(value);
    }).catch(cause => { if (!cancelled) setError(humanizeError(cause)); });
    if (feedbackPath) desktopApi.readDocument(project.path, feedbackPath).then(document => {
      if (!cancelled) setFeedbackReason({ status: "ready", content: document.content, path: feedbackPath });
    }).catch(() => {
      if (!cancelled) setFeedbackReason({ status: "missing", content: "", path: feedbackPath });
    });
    return () => { cancelled = true; };
  }, [project?.path, native, selectedCommit?.hash]);

  return <div className="history-workspace">
    <header className="history-header"><div><p className="eyebrow">PROJECT DOCUMENT HISTORY</p><h1>项目书历史</h1><p>选择一个版本，查看项目书具体改变了什么。</p></div><span className="git-state"><GitCommitHorizontal size={16}/>Git 版本记录已启用</span></header>
    {error && <div className="error-banner history-error">{error}</div>}
    <div className="history-browser project-only">
      <aside className="commit-pane" aria-label="项目书版本">
        <div className="pane-title"><strong>项目书版本</strong><span>{commits.length} 次</span></div>
        {loading ? <div className="pane-loading">正在读取历史…</div> : commits.length === 0 ? <div className="history-empty"><Sparkles size={25}/><strong>还没有项目书历史</strong><span>保存项目书后会显示在这里。</span></div> : commits.map(commit => {
          const Icon = commit.kind === "project" ? GitCompareArrows : Sparkles;
          return <button key={commit.hash} className={commit.hash === selectedCommit?.hash ? "commit-item selected" : "commit-item"} onClick={() => setSelectedCommit(commit)}><Icon size={16}/><div><strong>{cleanMessage(commit.message)}</strong><span>{formatDate(commit.timestamp)} · {commit.hash.slice(0, 8)}</span></div><em>{commit.relatedFeedbackPath ? "关联反馈" : commit.kind === "project" ? "项目书" : "初始版本"}</em></button>;
        })}
      </aside>
      <main className="history-version-detail">{selectedCommit ? <>
        <section className="history-reason" aria-label="修改原因"><header><div><span>DECISION CONTEXT</span><h2>为什么改</h2></div>{feedbackReason.path && <code>{feedbackReason.path}</code>}</header><div className="history-reason-body">
          {feedbackReason.status === "loading" && <div className="pane-loading">正在读取关联反馈…</div>}
          {feedbackReason.status === "ready" && <MarkdownEditor value={feedbackReason.content} onChange={() => undefined} preview />}
          {feedbackReason.status === "none" && <div className="history-reason-empty"><strong>未关联反馈</strong><span>这是旧版本或普通项目书提交，仍可查看下方差异。</span></div>}
          {feedbackReason.status === "missing" && <div className="history-reason-empty"><strong>关联反馈文件不可用</strong><span>文件可能已被移动或删除，下方项目书差异仍然保留。</span></div>}
        </div></section>
        <section className="history-change" aria-label="项目书修改"><header><span>PROJECT DOCUMENT DIFF</span><h2>改了什么</h2></header><div className="history-change-body"><DiffViewer key={selectedCommit.hash} file={projectDocument} raw={rawDiff}/></div></section>
      </> : <div className="history-empty"><GitCompareArrows size={30}/><strong>选择一个项目书版本</strong><span>修改原因和差异将在这里显示。</span></div>}</main>
    </div>
  </div>;
}

function cleanMessage(message: string) { return message.replace(/^[^:]+:\s*/, ""); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "时间未知" : date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
