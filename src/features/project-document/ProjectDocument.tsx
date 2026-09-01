import { Check, Edit3, Eye, GitCommitHorizontal, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { MarkdownEditor } from "../../components/editor/MarkdownEditor";
import { createProjectTemplate } from "../../templates/projectTemplate";
import { useAppStore } from "../../stores/appStore";
import { desktopApi, humanizeError } from "../../lib/desktop";

export function ProjectDocument() {
  const project = useAppStore(s => s.project); const [content, setContent] = useState(() => createProjectTemplate(project?.name || "项目书")); const [modifiedAt, setModifiedAt] = useState<string>(); const [preview, setPreview] = useState(true); const [saved, setSaved] = useState(true); const [error, setError] = useState("");
  useEffect(() => { if (!project || !desktopApi.isNative()) return; desktopApi.readDocument(project.path, "project.md").then(doc => { setContent(doc.content); setModifiedAt(doc.modifiedAt); setSaved(true); }).catch(cause => setError(humanizeError(cause))); }, [project]);
  async function save() { if (!project || !desktopApi.isNative()) return setSaved(true); try { const doc = await desktopApi.writeDocument(project.path, "project.md", content, modifiedAt); setModifiedAt(doc.modifiedAt); setSaved(true); await desktopApi.gitCommit(project.path, "plan: update project document").catch(() => undefined); } catch (cause) { setError(humanizeError(cause)); } }
  return <div className="page document-page"><div className="page-intro compact"><div><p className="eyebrow">PROJECT DOCUMENT</p><h1>项目书</h1><p>这是你目前对于这个学习项目的最新计划与假设。</p></div><div className="button-group"><button className="button secondary" onClick={() => setPreview(!preview)}>{preview ? <Edit3 size={16}/> : <Eye size={16}/>}{preview ? "编辑项目书" : "阅读预览"}</button><button className="button primary" disabled={saved} onClick={save}><Save size={16}/>{saved ? "已保存" : "保存"}</button></div></div>
    <div className="document-meta"><span><Check size={14}/>最近修改：{modifiedAt ? "已从磁盘重新载入" : "今天 22:35"}</span><span><GitCommitHorizontal size={15}/>当前版本已记录</span></div>{error && <div className="error-banner">{error}</div>}<div className="editor-surface"><MarkdownEditor value={content} preview={preview} onChange={value => { setContent(value); setSaved(false); setError(""); }}/></div>
  </div>;
}
