import { ArrowLeft, Folder, Info } from "lucide-react";
import { FormEvent, useState } from "react";
import { desktopApi, humanizeError } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";

export function CreateProject() {
  const { navigate, openProject } = useAppStore();
  const [name, setName] = useState(""); const [path, setPath] = useState(""); const [description, setDescription] = useState(""); const [targetDate, setTargetDate] = useState(""); const [error, setError] = useState("");
  async function chooseFolder() { if (!desktopApi.isNative()) return setPath("D:\\LearningMachine"); const chosen = await desktopApi.pickProjectFolder(); if (chosen) setPath(chosen); }
  async function submit(event: FormEvent) { event.preventDefault(); if (!name.trim() || !path.trim()) return setError("请填写项目名称并选择保存位置。"); try { const project = desktopApi.isNative() ? await desktopApi.createProject({ name: name.trim(), path, description, targetDate }) : { path: `${path}\\${name}`, name, description, targetDate, createdAt: new Date().toISOString(), status: "active" as const }; openProject(project); } catch (cause) { setError(humanizeError(cause)); } }
  return <main className="form-page"><button className="text-button" onClick={() => navigate("launcher")}><ArrowLeft size={16} /> 返回项目列表</button><div className="form-card"><p className="eyebrow">NEW LEARNING PROJECT</p><h1>创建学习项目</h1><p className="muted">项目将成为一个真实的本地文件夹，随时可以用资源管理器或其他工具打开。</p><form onSubmit={submit}>
    <label>项目名称<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="例如：2027 考研" /></label>
    <label>本地保存位置<div className="input-action"><input value={path} onChange={e => setPath(e.target.value)} placeholder="选择父文件夹" /><button type="button" onClick={chooseFolder}><Folder size={17} /> 浏览</button></div></label>
    <label>项目简介 <span>可选</span><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="用一句话描述这个项目" /></label>
    <label>目标日期 <span>可选</span><input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></label>
    <div className="info-note"><Info size={16} />将创建 project.md、feedback、materials、notes 和 archive 等开放目录。</div>{error && <div className="error-banner">{error}</div>}
    <div className="form-actions"><button type="button" className="button secondary" onClick={() => navigate("launcher")}>取消</button><button className="button primary">创建项目</button></div>
  </form></div></main>;
}
