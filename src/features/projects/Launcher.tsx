import { ArrowRight, FolderOpen, Plus, Sparkles } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { desktopApi, humanizeError } from "../../lib/desktop";
import { useState } from "react";
import type { LearningProject } from "../../types/domain";

const demoProject = { path: "demo", name: "2027 考研", description: "应用心理 · 学习反馈实验", createdAt: "2026-08-20T20:00:00+08:00", status: "active" as const, targetDate: "2027-12-20" };

export function Launcher() {
  const { navigate, openProject, recentProjects } = useAppStore();
  const [error, setError] = useState("");
  const visibleProjects = recentProjects.length ? recentProjects : [demoProject];

  async function openExisting() {
    if (!desktopApi.isNative()) return openProject(demoProject);
    let selectedPath: string | null = null;
    try {
      selectedPath = await desktopApi.pickProjectFolder();
      if (selectedPath) openProject(await desktopApi.openProject(selectedPath));
    } catch (cause) {
      const message = humanizeError(cause);
      if (String(cause).includes("PROJECT_NOT_FOUND") && selectedPath && window.confirm("这个文件夹还不是 Learning Machine 项目。是否初始化？已有内容不会被删除。")) {
        try { return openProject(await desktopApi.initializeExistingProject(selectedPath)); } catch (initCause) { return setError(humanizeError(initCause)); }
      }
      setError(message);
    }
  }
  async function openRecent(project: LearningProject) { if (!desktopApi.isNative() || project.path === "demo") return openProject(project); try { openProject(await desktopApi.openProject(project.path)); } catch (cause) { setError(`找不到项目文件夹。${humanizeError(cause)}`); } }

  return <main className="launcher">
    <header className="launcher-brand"><div className="brand-mark"><Sparkles size={18} /></div><span>Learning Machine</span><small>学习机</small></header>
    <section className="launcher-hero">
      <p className="eyebrow">LOCAL-FIRST LEARNING WORKSPACE</p>
      <h1>选择一个学习项目</h1>
      <p className="hero-copy">把计划放进现实，用高频反馈持续修正。所有资料、笔记和学习历史，都留在你自己的电脑里。</p>
      <div className="launcher-actions">
        <button className="button primary" onClick={() => navigate("create-project")}><Plus size={17} /> 创建学习项目</button>
        <button className="button secondary" onClick={openExisting}><FolderOpen size={17} /> 打开已有项目</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
    </section>
    <section className="recent-section">
      <div className="section-heading"><div><span className="eyebrow">RECENT</span><h2>最近项目</h2></div><span className="muted">{visibleProjects.filter(p => p.status === "active").length} 个活跃项目</span></div>
      {visibleProjects.map(project => <button key={project.path} className="project-card" onClick={() => openRecent(project)}>
        <div className="project-monogram">{project.name.slice(-1)}</div><div className="project-card-copy"><strong>{project.name}</strong><span>{project.description || "本地学习项目"} · 最近打开</span></div><span className="status-dot">{project.status === "active" ? "活跃" : "已归档"}</span><ArrowRight size={18} />
      </button>)}
    </section>
    <footer className="launcher-footer"><span>文件属于你，学习过程也属于你。</span><span>v0.1 · Local first</span></footer>
  </main>;
}
