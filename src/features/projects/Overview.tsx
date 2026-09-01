import { ArrowRight, BookOpen, CalendarDays, Clock3, FileText, MessageSquareText, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { desktopApi, humanizeError } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import type { FeedbackDocument, GitCommit, ProjectFile } from "../../types/domain";
import { createOverviewSnapshot, type OverviewSnapshot } from "./overviewModel";

const emptySnapshot: OverviewSnapshot = { target: null, daysRemaining: null, latestFeedback: null, recentFile: null, latestAdjustment: null };

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
      desktopApi.readDocument(project.path, "project.md"),
      desktopApi.listFeedback(project.path),
      desktopApi.listFiles(project.path),
      desktopApi.gitHistory(project.path)
    ]).then(async ([documentResult, feedbackResult, filesResult, commitsResult]) => {
      if (cancelled) return;
      const projectMarkdown = documentResult.status === "fulfilled" ? documentResult.value.content : "";
      const feedback = feedbackResult.status === "fulfilled" ? feedbackResult.value : [] as FeedbackDocument[];
      const files = filesResult.status === "fulfilled" ? filesResult.value : [] as ProjectFile[];
      const commits = commitsResult.status === "fulfilled" ? commitsResult.value : [] as GitCommit[];
      let latestFeedbackContent: string | undefined;
      if (feedback[0]) {
        try { latestFeedbackContent = (await desktopApi.readDocument(project.path, feedback[0].path)).content; }
        catch { latestFeedbackContent = undefined; }
      }
      if (!cancelled) setSnapshot(createOverviewSnapshot({ project, projectMarkdown, feedback, files, commits, latestFeedbackContent }));
      const requiredFailure = [documentResult, feedbackResult, filesResult].find(result => result.status === "rejected");
      if (!cancelled && requiredFailure?.status === "rejected") setError(humanizeError(requiredFailure.reason));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [project?.path, native]);

  if (!project) return null;
  if (!native) return <DemoOverview/>;

  const feedbackExcerpt = snapshot.latestFeedback?.content ? toExcerpt(snapshot.latestFeedback.content) : null;
  const openRecentFile = () => {
    if (!snapshot.recentFile) return;
    selectPath(snapshot.recentFile.path);
    navigate("markdown-editor");
  };

  return <div className="page overview-page">
    <div className="page-intro"><div><p className="eyebrow">PROJECT OVERVIEW</p><h1>{project.name}</h1><p>{project.description || "一个持续校准目标与现实的学习项目"}</p></div><button className="button primary" onClick={() => navigate("feedback-editor")}><MessageSquareText size={17}/>记录反馈</button></div>
    {error && <div className="error-banner">部分项目数据暂时无法读取：{error}</div>}
    <div className="metric-grid">
      <article><span className="metric-icon"><BookOpen size={18}/></span><small>当前目标</small><strong>{loading ? "正在读取…" : snapshot.target || "尚未填写目标"}</strong><button onClick={() => navigate("project-document")}>查看项目书 <ArrowRight size={14}/></button></article>
      <article><span className="metric-icon"><CalendarDays size={18}/></span><small>距离目标日期</small>{snapshot.daysRemaining === null ? <><strong>未设置</strong><span>可在项目设置中添加目标日期</span></> : <><strong className="metric-number">{snapshot.daysRemaining} <em>天</em></strong><span>目标日期 · {formatDate(project.targetDate!)}</span></>}</article>
      <article><span className="metric-icon"><RotateCcw size={18}/></span><small>反馈节奏</small><strong>{snapshot.latestFeedback ? formatDateTime(snapshot.latestFeedback.createdAt) : "暂无反馈"}</strong><span>{snapshot.latestFeedback ? "最近一次反馈" : "记录后将在这里显示"}</span></article>
      <article><span className="metric-icon"><Clock3 size={18}/></span><small>最近调整</small><strong>{snapshot.latestAdjustment ? formatDateTime(snapshot.latestAdjustment.timestamp) : "尚无调整"}</strong><span>{snapshot.latestAdjustment?.message || "项目书保存新版本后显示"}</span></article>
    </div>
    <div className="overview-columns">
      <section className="panel continue-panel"><div className="panel-title"><div><p className="eyebrow">CONTINUE</p><h2>继续学习</h2></div><span>最近修改</span></div>{snapshot.recentFile ? <div className="continue-file"><div className="file-icon"><FileText size={22}/></div><div><strong>{snapshot.recentFile.name}</strong><span>{snapshot.recentFile.path} · {formatDateTime(snapshot.recentFile.modifiedAt)}</span></div><button className="button secondary" onClick={openRecentFile}>继续 <ArrowRight size={15}/></button></div> : <div className="overview-empty"><FileText size={25}/><div><strong>暂无最近文件</strong><span>在文件区创建学习笔记后会显示在这里。</span></div></div>}<div className="focus-note"><span>当前阶段重点</span><p>{snapshot.target || "打开项目书，写下当前阶段最重要的学习目标。"}</p></div></section>
      <section className="panel latest-feedback"><div className="panel-title"><div><p className="eyebrow">LATEST FEEDBACK</p><h2>最近反馈</h2></div><button onClick={() => navigate("feedback")}>查看全部</button></div>{snapshot.latestFeedback ? <><blockquote>“{feedbackExcerpt || snapshot.latestFeedback.title || "这份反馈还没有正文摘要。"}”</blockquote><div className="feedback-meta"><span>{formatDateTime(snapshot.latestFeedback.createdAt)}</span>{snapshot.latestFeedback.requestsAdjustment && <span className="adjust-tag">建议调整项目书</span>}</div><button className="link-row" onClick={() => { selectPath(snapshot.latestFeedback!.path); navigate("feedback"); }}><MessageSquareText size={16}/>查看这份反馈 <ArrowRight size={15}/></button></> : <div className="overview-empty"><MessageSquareText size={25}/><div><strong>还没有反馈</strong><span>记录第一次学习反馈，开始用现实校准计划。</span></div></div>}</section>
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

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

function DemoOverview() {
  const { project, navigate } = useAppStore();
  return <div className="page overview-page"><div className="page-intro"><div><p className="eyebrow">PROJECT OVERVIEW</p><h1>{project?.name}</h1><p>{project?.description || "一个持续校准目标与现实的学习项目"}</p></div><button className="button primary" onClick={() => navigate("feedback-editor")}><MessageSquareText size={17}/>记录反馈</button></div><div className="metric-grid"><article><span className="metric-icon"><BookOpen size={18}/></span><small>当前目标</small><strong>建立稳定、可验证的学习节奏</strong><button onClick={() => navigate("project-document")}>查看项目书 <ArrowRight size={14}/></button></article><article><span className="metric-icon"><CalendarDays size={18}/></span><small>距离目标考试</small><strong className="metric-number">478 <em>天</em></strong><span>目标日期 · 2027 年 12 月 20 日</span></article><article><span className="metric-icon"><RotateCcw size={18}/></span><small>反馈节奏</small><strong>今天 21:32</strong><span>最近一次反馈</span></article><article><span className="metric-icon"><Clock3 size={18}/></span><small>最近调整</small><strong>3 天前</strong><span>项目书已保存新版本</span></article></div><div className="overview-columns"><section className="panel continue-panel"><div className="panel-title"><div><p className="eyebrow">CONTINUE</p><h2>继续学习</h2></div><span>最近打开</span></div><div className="continue-file"><div className="file-icon"><FileText size={22}/></div><div><strong>英语阅读理解.md</strong><span>notes / 英语 · 今天 22:04</span></div><button className="button secondary">继续 <ArrowRight size={15}/></button></div><div className="focus-note"><span>当前阶段重点</span><p>把阅读训练从“完成篇数”调整为“定位错误类型并复盘证据”。</p></div></section><section className="panel latest-feedback"><div className="panel-title"><div><p className="eyebrow">LATEST FEEDBACK</p><h2>最近反馈</h2></div><button onClick={() => navigate("feedback")}>查看全部</button></div><blockquote>“数学实际进度比计划慢。继续堆新内容只会扩大缺口，下一轮应降低每日新内容，并固定错题复盘。”</blockquote><div className="feedback-meta"><span>今天 21:32</span><span className="adjust-tag">建议调整项目书</span></div><button className="link-row" onClick={() => navigate("feedback")}><MessageSquareText size={16}/>查看这份反馈 <ArrowRight size={15}/></button></section></div></div>;
}
