import { ArrowLeft, ArrowRight, Calendar, FileText, Lightbulb, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MarkdownEditor } from "../../components/editor/MarkdownEditor";
import { appendFeedbackTemplate } from "../../templates/feedbackTemplate";
import { useAppStore } from "../../stores/appStore";
import { desktopApi, humanizeError } from "../../lib/desktop";
import type { FeedbackDocument } from "../../types/domain";

const samples = [
  { date: "今天 · 21:32", title: "数学进度与错题复盘", excerpt: "实际进度比计划慢，需要降低每日新内容并增加错题复习。", adjust: true },
  { date: "8 月 27 日 · 22:16", title: "英语阅读训练第一次复盘", excerpt: "阅读速度不是主要问题，证据定位仍然不稳定。", adjust: false },
  { date: "8 月 24 日 · 20:40", title: "第一周现实检验", excerpt: "每日可持续学习时长低于最初估计。", adjust: true }
];

export function FeedbackWorkspace({ editing }: { editing: boolean }) {
  const navigate = useAppStore(state => state.navigate);
  const project = useAppStore(state => state.project);
  const selectedPath = useAppStore(state => state.selectedPath);
  const selectPath = useAppStore(state => state.selectPath);
  const startProjectAdjustment = useAppStore(state => state.startProjectAdjustment);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [content, setContent] = useState("");
  const [showPrompts, setShowPrompts] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<FeedbackDocument[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDocument | null>(null);
  const [selectedDocument, setSelectedDocument] = useState("");
  const native = desktopApi.isNative();

  async function openFeedback(item: FeedbackDocument) {
    if (!project || !native) return;
    try {
      const document = await desktopApi.readDocument(project.path, item.path);
      setSelectedFeedback(item);
      setSelectedDocument(document.content);
      selectPath(item.path);
      setError("");
    } catch (cause) {
      setError(humanizeError(cause));
    }
  }

  useEffect(() => {
    if (!project || !native || editing) return;
    let cancelled = false;
    desktopApi.listFeedback(project.path).then(async items => {
      if (cancelled) return;
      setDocuments(items);
      const initial = items.find(item => item.path === selectedPath) ?? items[0] ?? null;
      if (!initial) {
        setSelectedFeedback(null);
        setSelectedDocument("");
        return;
      }
      try {
        const document = await desktopApi.readDocument(project.path, initial.path);
        if (cancelled) return;
        setSelectedFeedback(initial);
        setSelectedDocument(document.content);
        selectPath(initial.path);
      } catch (cause) {
        if (!cancelled) setError(humanizeError(cause));
      }
    }).catch(cause => { if (!cancelled) setError(humanizeError(cause)); });
    return () => { cancelled = true; };
  }, [project?.path, editing, native]);

  async function saveFeedback(adjustProject = false) {
    try {
      if (project && native) {
        const document = await desktopApi.createFeedback(project.path, content);
        await desktopApi.gitCommit(project.path, `feedback: add learning feedback ${document.path.split("/").pop()?.replace(".md", "")}`).catch(() => undefined);
        selectPath(document.path);
        if (adjustProject) {
          const projectDocument = await desktopApi.readDocument(project.path, "project.md");
          const feedbackTitle = content.split("\n").find(line => line.startsWith("# "))?.slice(2).trim() || document.path.split("/").pop()?.replace(".md", "") || "学习反馈";
          startProjectAdjustment({
            feedbackPath: document.path,
            feedbackTitle,
            feedbackCreatedAt: new Date().toISOString(),
            feedbackContent: content,
            originalProjectContent: projectDocument.content,
            draftProjectContent: projectDocument.content,
            projectModifiedAt: projectDocument.modifiedAt,
            versionNote: "根据反馈调整项目书",
            saveState: "editing"
          });
          return;
        }
      }
      setError("");
      navigate("feedback");
    } catch (cause) {
      setError(humanizeError(cause));
    }
  }

  async function deleteFeedback() {
    if (!project || !selectedFeedback || !native) return;
    if (!window.confirm(`确定删除“${selectedFeedback.title || selectedFeedback.path}”吗？此操作无法撤销。`)) return;
    try {
      await desktopApi.deleteEntry(project.path, selectedFeedback.path);
      const remaining = documents.filter(item => item.path !== selectedFeedback.path);
      setDocuments(remaining);
      const next = remaining[0] ?? null;
      if (next) await openFeedback(next);
      else {
        setSelectedFeedback(null);
        setSelectedDocument("");
        selectPath(null);
      }
      setError("");
    } catch (cause) {
      setError(humanizeError(cause));
    }
  }

  if (editing) return <div className="page feedback-editor">
    <button className="text-button" onClick={() => navigate("feedback")}><ArrowLeft size={15}/>返回反馈列表</button>
    <div className="page-intro compact"><div><p className="eyebrow">OPEN FEEDBACK</p><h1>新建学习反馈</h1><p>自由记录实际发生的事情，再决定是否调整项目书。</p></div><div className="button-group"><button className="button" onClick={() => saveFeedback(false)}><Save size={16}/>保存反馈</button><button className="button primary" onClick={() => saveFeedback(true)}><ArrowRight size={16}/>保存并调整项目书</button></div></div>
    <div className="feedback-date"><Calendar size={15}/>{today} · 将保存为 feedback/{today}-01.md</div>
    {error && <div className="error-banner">{error}</div>}
    <div className="feedback-writing-tools"><button className="button" onClick={() => setShowPrompts(value => !value)}><Lightbulb size={15}/>{showPrompts ? "收起写作提示" : "查看写作提示"}</button><button className="button" onClick={() => setContent(value => appendFeedbackTemplate(value, today))}><Plus size={15}/>插入完整复盘模板</button></div>
    {showPrompts && <div className="feedback-prompts"><span>实际发生了什么</span><span>哪些判断发生了变化</span><span>哪些内容值得保持</span><span>下一步想改变什么</span></div>}
    <div className="editor-surface feedback-surface"><MarkdownEditor value={content} onChange={value => { setContent(value); setError(""); }} preview={false}/></div>
  </div>;

  return <div className="page feedback-page">
    <div className="page-intro compact"><div><p className="eyebrow">LEARNING FEEDBACK</p><h1>反馈</h1><p>用现实校准计划，让每次学习都能推动下一次调整。</p></div><button className="button primary" onClick={() => navigate("feedback-editor")}><Plus size={17}/>新建反馈</button></div>
    {error && <div className="error-banner">{error}</div>}
    <div className="feedback-layout">
      <div className="feedback-list">
        {native && documents.length === 0 && <div className="feedback-empty"><FileText size={28}/><strong>暂无反馈</strong><span>点击“新建反馈”记录第一次复盘。</span></div>}
        {native ? documents.map(item => <button key={item.path} className={item.path === selectedFeedback?.path ? "feedback-item selected" : "feedback-item"} onClick={() => openFeedback(item)}><FileText size={18}/><div><span>{new Date(Number(item.createdAt)).toLocaleString("zh-CN")}</span><strong>{item.title || item.path.split("/").pop()}</strong><p>{item.path}</p></div>{item.requestsAdjustment && <em>需调整</em>}</button>) : samples.map((item, index) => <button key={item.date} className={index === 0 ? "feedback-item selected" : "feedback-item"}><FileText size={18}/><div><span>{item.date}</span><strong>{item.title}</strong><p>{item.excerpt}</p></div>{item.adjust && <em>需调整</em>}</button>)}
      </div>
      <article className="feedback-detail">
        {native ? selectedFeedback && selectedDocument ? <>
          <div className="detail-actions"><div><span>{new Date(Number(selectedFeedback.createdAt)).toLocaleString("zh-CN")}</span><strong>{selectedFeedback.title || selectedFeedback.path.split("/").pop()}</strong></div><button className="button danger" onClick={deleteFeedback}><Trash2 size={15}/>删除反馈</button></div>
          <MarkdownEditor value={selectedDocument} onChange={() => undefined} preview />
          {selectedFeedback.requestsAdjustment && <div className="adjust-callout"><span>这份反馈建议修改当前项目书</span><button onClick={() => navigate("project-document")}>打开项目书 <ArrowRight size={14}/></button></div>}
        </> : <div className="feedback-detail-empty"><FileText size={32}/><strong>还没有反馈</strong><span>新建反馈后会在这里以只读方式预览。</span></div> : <DemoFeedback navigate={navigate}/>} 
      </article>
    </div>
  </div>;
}

function DemoFeedback({ navigate }: { navigate: ReturnType<typeof useAppStore.getState>["navigate"] }) {
  return <><div className="detail-header"><div><span>今天 · 21:32</span><h2>数学进度与错题复盘</h2></div></div><h3>原计划是什么？</h3><p>完成数学强化课程两讲，并整理对应错题。</p><h3>实际发生了什么？</h3><p>只完成一讲。第二讲开始前花了较长时间回看基础概念，错题整理没有完成。</p><h3>判断与调整</h3><p>问题不是单纯的效率低，而是基础熟练度不足。下一轮降低新内容比例，固定晚间 30 分钟做错题复盘。</p><div className="adjust-callout"><span>这份反馈建议修改当前项目书</span><button onClick={() => navigate("project-document")}>打开项目书 <ArrowRight size={14}/></button></div></>;
}
