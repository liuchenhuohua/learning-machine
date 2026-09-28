import { ArrowRight, BookOpen, Clock3, FileText, MessageSquareText } from "lucide-react";
import { useEffect, useState } from "react";
import { desktopApi, humanizeError } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import type { FeedbackDocument, GitCommit, ProjectFile } from "../../types/domain";
import { createOverviewSnapshot, type OverviewSnapshot } from "./overviewModel";

const emptySnapshot: OverviewSnapshot = { latestFeedback: null, recentFile: null, latestProjectChange: null };

export function Overview() {
  const { project, navigate, selectPath } = useAppStore();
  const [snapshot, setSnapshot] = useState<OverviewSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const native = desktopApi.isNative();

  useEffect(() => {
    if (!project || !native) return;
    let cancelled = false;
    setSnapshot(emptySnapshot);
    setLoading(true);
    setError("");
    Promise.allSettled([
      desktopApi.listFeedback(project.path),
      desktopApi.listFiles(project.path),
      desktopApi.gitHistory(project.path)
    ]).then(async ([feedbackResult, filesResult, commitsResult]) => {
      if (cancelled) return;
      const feedback = feedbackResult.status === "fulfilled" ? feedbackResult.value : [] as FeedbackDocument[];
      const files = filesResult.status === "fulfilled" ? filesResult.value : [] as ProjectFile[];
      const commits = commitsResult.status === "fulfilled" ? commitsResult.value : [] as GitCommit[];
      let latestFeedbackContent: string | undefined;
      if (feedback[0]) {
        try { latestFeedbackContent = (await desktopApi.readDocument(project.path, feedback[0].path)).content; }
        catch { latestFeedbackContent = undefined; }
      }
      if (!cancelled) setSnapshot(createOverviewSnapshot({ feedback, files, commits, latestFeedbackContent }));
      const requiredFailure = [feedbackResult, filesResult].find(result => result.status === "rejected");
      if (!cancelled && requiredFailure?.status === "rejected") setError(humanizeError(requiredFailure.reason));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [project?.path, native]);

  if (!project) return null;

  const feedbackExcerpt = snapshot.latestFeedback?.content ? toExcerpt(snapshot.latestFeedback.content) : null;
  const openRecentFile = () => {
    if (!snapshot.recentFile) return;
    selectPath(snapshot.recentFile.path);
    navigate("markdown-editor");
  };
  return <div className="page overview-page">
    <div className="page-intro"><div><p className="eyebrow">PROJECT OVERVIEW</p><h1>{project.name}</h1><p>{project.description || "一个持续校准目标与现实的学习项目"}</p></div><button className="button primary" onClick={() => navigate("feedback-editor")}><MessageSquareText size={17}/>记录反馈</button></div>
    {error && <div className="error-banner">部分项目数据暂时无法读取：{error}</div>}
    <button className="overview-project-review" onClick={() => navigate("project-document")}><span className="file-icon"><BookOpen size={21}/></span><div><h2>回顾当前项目书</h2><p>重新阅读当前计划与假设，确认它是否仍符合实际情况。</p></div><span>{loading ? "正在读取…" : "打开项目书"}<ArrowRight size={16}/></span></button>
    <div className="overview-activity-grid">
      <section className="panel latest-feedback"><div className="panel-title"><div><p className="eyebrow">LATEST FEEDBACK</p><h2>最近反馈</h2></div><button onClick={() => navigate("feedback")}>查看全部</button></div>{snapshot.latestFeedback ? <><blockquote>“{feedbackExcerpt || snapshot.latestFeedback.title || "这份反馈还没有正文摘要。"}”</blockquote><div className="feedback-meta"><span>{formatDateTime(snapshot.latestFeedback.createdAt)}</span>{snapshot.latestFeedback.requestsAdjustment && <span className="adjust-tag">建议调整项目书</span>}</div><button className="link-row" onClick={() => { selectPath(snapshot.latestFeedback!.path); navigate("feedback"); }}><MessageSquareText size={16}/>查看这份反馈 <ArrowRight size={15}/></button></> : <div className="overview-empty"><MessageSquareText size={25}/><div><strong>还没有反馈</strong><span>记录第一次学习反馈，开始用现实校准计划。</span></div></div>}</section>
      <section className="panel recent-change"><div className="panel-title"><div><p className="eyebrow">PROJECT CHANGE</p><h2>最近项目书变化</h2></div><button onClick={() => navigate("history")}>查看历史</button></div>{snapshot.latestProjectChange ? <div className="recent-change-content"><span className="file-icon"><BookOpen size={21}/></span><strong>{cleanCommitMessage(snapshot.latestProjectChange.message)}</strong><span><Clock3 size={13}/>{formatDateTime(snapshot.latestProjectChange.timestamp)}</span><button className="link-row" onClick={() => navigate("history")}>查看变化原因与内容 <ArrowRight size={15}/></button></div> : <div className="overview-empty"><BookOpen size={25}/><div><strong>尚无项目书变化</strong><span>保存项目书的新版本后会显示在这里。</span></div></div>}</section>
      <section className="panel continue-panel"><div className="panel-title"><div><p className="eyebrow">CONTINUE</p><h2>继续最近资料或笔记</h2></div><span>最近修改</span></div>{snapshot.recentFile ? <div className="continue-file"><div className="file-icon"><FileText size={22}/></div><div><strong>{snapshot.recentFile.name}</strong><span>{snapshot.recentFile.path} · {formatDateTime(snapshot.recentFile.modifiedAt)}</span></div><button className="button secondary" onClick={openRecentFile}>继续 <ArrowRight size={15}/></button></div> : <div className="overview-empty"><FileText size={25}/><div><strong>暂无最近文件</strong><span>创建资料或笔记后会显示在这里。</span></div></div>}</section>
    </div>
  </div>;
}

function toExcerpt(markdown: string) {
  return markdown.replace(/^#{1,6}\s+/gm, "").replace(/[*_>`~-]/g, "").replace(/\s+/g, " ").trim().slice(0, 150);
}

function parseTimestamp(value?: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? new Date(numeric) : new Date(value || "");
}

function formatDateTime(value?: string) {
  const date = parseTimestamp(value);
  return Number.isNaN(date.getTime()) ? "时间未知" : date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function cleanCommitMessage(message: string) {
  return message.replace(/^plan:\s*/i, "").trim() || "项目书已更新";
}
