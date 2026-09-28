import { ArrowLeft, CheckCircle2, FileWarning, GitCommitHorizontal, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { DiffViewer } from "../history/DiffViewer";
import { desktopApi, humanizeError } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import { buildProjectUnifiedDiff } from "./projectDiff";

export function ProjectVersionConfirmation() {
  const project = useAppStore(state => state.project);
  const draft = useAppStore(state => state.projectAdjustment);
  const navigate = useAppStore(state => state.navigate);
  const updateDraft = useAppStore(state => state.updateProjectAdjustment);
  const clearDraft = useAppStore(state => state.clearProjectAdjustment);
  const [note, setNote] = useState(draft?.versionNote ?? "根据反馈调整项目书");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const rawDiff = useMemo(() => draft ? buildProjectUnifiedDiff(draft.originalProjectContent, draft.draftProjectContent) : "", [draft?.originalProjectContent, draft?.draftProjectContent]);

  if (!draft || !project) {
    return <div className="page adjustment-missing"><FileWarning size={34} /><h1>没有可确认的项目书修改</h1><p>项目或调整草稿不存在，尚未写入任何内容。</p><button className="button primary" onClick={() => navigate("feedback")}>返回反馈列表</button></div>;
  }

  async function recordHistory() {
    if (!project || !draft) return;
    setSaving(true);
    setError("");
    try {
      await desktopApi.gitCommitProjectVersion(project.path, note.trim(), draft.feedbackPath);
      clearDraft();
      navigate("history");
    } catch {
      updateDraft({ saveState: "file-saved-history-pending", versionNote: note.trim() });
      setError("项目书已保存，但版本历史尚未记录。");
    } finally {
      setSaving(false);
    }
  }

  async function saveVersion() {
    if (!project || !draft || !rawDiff || !note.trim()) return;
    if (draft.saveState === "file-saved-history-pending") return recordHistory();
    setSaving(true);
    setError("");
    try {
      const saved = await desktopApi.writeDocument(project.path, "project.md", draft.draftProjectContent, draft.projectModifiedAt);
      updateDraft({ projectModifiedAt: saved.modifiedAt, saveState: "file-saved-history-pending", versionNote: note.trim() });
    } catch (cause) {
      setError(humanizeError(cause));
      setSaving(false);
      return;
    }
    setSaving(false);
    await recordHistory();
  }

  const historyPending = draft.saveState === "file-saved-history-pending";
  return <div className="page version-confirmation-page">
    <div className="confirmation-toolbar">
      <button className="text-button" disabled={historyPending || saving} onClick={() => navigate("project-adjustment")}><ArrowLeft size={15} />返回继续修改</button>
      <button className="button primary" disabled={!rawDiff || !note.trim() || saving} onClick={saveVersion}>{historyPending ? <RotateCcw size={16} /> : <CheckCircle2 size={16} />}{saving ? "正在保存…" : historyPending ? "重试记录历史" : "确认保存新版本"}</button>
    </div>
    <header className="confirmation-intro"><p className="eyebrow">REVIEW CHANGES</p><h1>确认项目书修改</h1><p>保存前检查具体变化，并记录这次调整的原因。</p></header>
    <section className="confirmation-meta">
      <div><span>关联反馈</span><strong>{draft.feedbackTitle}</strong><small>{formatFeedbackTime(draft.feedbackCreatedAt)}</small></div>
      <label><span><GitCommitHorizontal size={14} />版本说明</span><input aria-label="版本说明" value={note} disabled={historyPending} onChange={event => { setNote(event.target.value); updateDraft({ versionNote: event.target.value }); }} /></label>
    </section>
    {error && <div className={historyPending ? "warning-banner" : "error-banner"}>{error}</div>}
    {rawDiff ? <DiffViewer file={{ path: "project.md", status: "modified" }} raw={rawDiff} /> : <div className="confirmation-empty"><strong>项目书没有变化</strong><span>返回调整工作区修改内容后，才能保存新版本。</span></div>}
  </div>;
}

function formatFeedbackTime(value: string) {
  const numeric = Number(value);
  const date = Number.isFinite(numeric) && numeric > 0 ? new Date(numeric) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}
