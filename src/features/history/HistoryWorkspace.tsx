import { GitCommitHorizontal, GitCompareArrows, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { desktopApi, humanizeError } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import type { GitChangedFile, GitCommit } from "../../types/domain";
import { DiffViewer } from "./DiffViewer";

const demoCommits: GitCommit[] = [
  { hash: "demo-plan", message: "plan: 调整数学学习时间", kind: "project", author: "Learning Machine", timestamp: "2026-08-29T22:41:00+08:00" },
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

  useEffect(() => {
    if (!project || !native) return;
    let cancelled = false;
    setCommits([]); setSelectedCommit(null); setRawDiff(""); setLoading(true); setError("");
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
    desktopApi.gitFileDiff(project.path, selectedCommit.hash, "project.md").then(value => {
      if (!cancelled) setRawDiff(value);
    }).catch(cause => { if (!cancelled) setError(humanizeError(cause)); });
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
          return <button key={commit.hash} className={commit.hash === selectedCommit?.hash ? "commit-item selected" : "commit-item"} onClick={() => setSelectedCommit(commit)}><Icon size={16}/><div><strong>{cleanMessage(commit.message)}</strong><span>{formatDate(commit.timestamp)} · {commit.hash.slice(0, 8)}</span></div><em>{commit.kind === "project" ? "项目书" : "初始版本"}</em></button>;
        })}
      </aside>
      <main className="diff-pane">{selectedCommit ? <DiffViewer key={selectedCommit.hash} file={projectDocument} raw={rawDiff}/> : <div className="history-empty"><GitCompareArrows size={30}/><strong>选择一个项目书版本</strong><span>差异将在这里按行显示。</span></div>}</main>
    </div>
  </div>;
}

function cleanMessage(message: string) { return message.replace(/^[^:]+:\s*/, ""); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "时间未知" : date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
