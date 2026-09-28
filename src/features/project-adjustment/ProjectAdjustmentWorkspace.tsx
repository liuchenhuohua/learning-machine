import { ArrowLeft, ArrowRight, FileWarning, MessageSquareText, NotebookPen } from "lucide-react";
import { MarkdownEditor } from "../../components/editor/MarkdownEditor";
import { useAppStore } from "../../stores/appStore";

export function ProjectAdjustmentWorkspace() {
  const draft = useAppStore(state => state.projectAdjustment);
  const navigate = useAppStore(state => state.navigate);
  const updateProjectAdjustment = useAppStore(state => state.updateProjectAdjustment);

  if (!draft) {
    return <div className="page adjustment-missing">
      <FileWarning size={34} />
      <h1>没有可继续的项目书调整</h1>
      <p>调整草稿可能已经被清理。反馈和项目书文件没有受到影响。</p>
      <button className="button primary" onClick={() => navigate("feedback")}>返回反馈列表</button>
    </div>;
  }

  return <div className="page project-adjustment-page">
    <div className="adjustment-toolbar">
      <button className="text-button" onClick={() => navigate("feedback")}><ArrowLeft size={15} />返回反馈</button>
      <button className="button primary" onClick={() => navigate("project-version-confirmation")}>查看修改差异<ArrowRight size={16} /></button>
    </div>
    <header className="adjustment-intro">
      <p className="eyebrow">FEEDBACK → PROJECT DOCUMENT</p>
      <h1>根据反馈调整项目书</h1>
      <p>反馈是现实证据，项目书是当前假设；由你决定修改哪些部分。</p>
    </header>
    <div className="adjustment-columns">
      <section className="adjustment-pane feedback-evidence" aria-label="本次反馈（只读）">
        <div className="adjustment-pane-header">
          <MessageSquareText size={17} />
          <div><span>本次反馈 · 只读</span><h2>{draft.feedbackTitle}</h2><small>{formatFeedbackTime(draft.feedbackCreatedAt)}</small></div>
        </div>
        <div className="adjustment-pane-body"><MarkdownEditor value={draft.feedbackContent} onChange={() => undefined} preview /></div>
      </section>
      <section className="adjustment-pane project-hypothesis" aria-label="当前项目书（可编辑）">
        <div className="adjustment-pane-header">
          <NotebookPen size={17} />
          <div><span>当前项目书 · 可编辑</span><h2>项目书</h2><small>改动暂存在本窗口，确认后才会写入文件</small></div>
        </div>
        <div className="adjustment-pane-body editor-scroll-host"><MarkdownEditor value={draft.draftProjectContent} onChange={draftProjectContent => updateProjectAdjustment({ draftProjectContent })} preview={false} scrollPastEnd /></div>
      </section>
    </div>
  </div>;
}

function formatFeedbackTime(value: string) {
  const numeric = Number(value);
  const date = Number.isFinite(numeric) && numeric > 0 ? new Date(numeric) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}
