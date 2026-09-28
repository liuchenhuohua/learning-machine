import { Check, Edit3, Eye, FileText, GitCommitHorizontal, Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { MarkdownEditor } from "../../components/editor/MarkdownEditor";
import { createProjectTemplate } from "../../templates/projectTemplate";
import { useAppStore } from "../../stores/appStore";
import { desktopApi, humanizeError } from "../../lib/desktop";
import { appendMarkdownTemplate } from "../../lib/markdownTemplate";

export function ProjectDocument() {
  const project = useAppStore(s => s.project); const [content, setContent] = useState(() => createProjectTemplate(project?.name || "项目书")); const [modifiedAt, setModifiedAt] = useState<string>(); const [preview, setPreview] = useState(true); const [saved, setSaved] = useState(true); const [error, setError] = useState(""); const [templateNotice, setTemplateNotice] = useState("");
  useEffect(() => { if (!project || !desktopApi.isNative()) return; desktopApi.readDocument(project.path, "project.md").then(doc => { setContent(doc.content); setModifiedAt(doc.modifiedAt); setSaved(true); }).catch(cause => setError(humanizeError(cause))); }, [project]);
  async function save() { if (!project || !desktopApi.isNative()) return setSaved(true); try { const doc = await desktopApi.writeDocument(project.path, "project.md", content, modifiedAt); setModifiedAt(doc.modifiedAt); setSaved(true); await desktopApi.gitCommit(project.path, "plan: update project document").catch(() => undefined); } catch (cause) { setError(humanizeError(cause)); } }
  async function insertTemplate() { if (!project || !desktopApi.isNative()) return; try { const sourcePath = await desktopApi.pickMarkdownTemplate(); if (!sourcePath) return; const template = await desktopApi.importMarkdownTemplate(project.path, sourcePath); setContent(value => appendMarkdownTemplate(value, template.content)); setSaved(false); setPreview(false); setTemplateNotice(`模板已复制到 ${template.path}`); setError(""); } catch (cause) { setTemplateNotice(""); setError(humanizeError(cause)); } }
  return <div className="page document-page"><div className="page-intro compact"><div><p className="eyebrow">PROJECT DOCUMENT</p><h1>项目书</h1><p>这是你目前对于这个学习项目的最新计划与假设。</p></div><div className="button-group"><button className="button" onClick={insertTemplate}><Plus size={16}/>插入模板</button><button className="button secondary" onClick={() => setPreview(!preview)}>{preview ? <Edit3 size={16}/> : <Eye size={16}/>}{preview ? "编辑项目书" : "阅读预览"}</button><button className="button primary" disabled={saved} onClick={save}><Save size={16}/>{saved ? "已保存" : "保存"}</button></div></div>
    <div className="document-meta"><span><Check size={14}/>最近修改：{modifiedAt ? "已从磁盘重新载入" : "今天 22:35"}</span><span><GitCommitHorizontal size={15}/>当前版本已记录</span></div>{error && <div className="error-banner">{error}</div>}{templateNotice && <div className="saved-callout"><FileText size={17}/><div><strong>{templateNotice}</strong><span>模板内容已追加到当前项目书，保存后写入 project.md。</span></div></div>}<div className="editor-surface"><MarkdownEditor value={content} preview={preview} onChange={value => { setContent(value); setSaved(false); setError(""); }}/></div>
  </div>;
}
