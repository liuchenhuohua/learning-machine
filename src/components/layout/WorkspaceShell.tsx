import { AppWindow, Archive, BookOpenText, ChevronDown, Clock3, FileStack, FolderOpen, Home, MessageSquareText, Moon, Plus, Search, Settings2, Sun, X } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "../../stores/appStore";
import type { AppView } from "../../types/domain";
import { Overview } from "../../features/projects/Overview";
import { ProjectDocument } from "../../features/project-document/ProjectDocument";
import { FeedbackWorkspace } from "../../features/feedback/FeedbackWorkspace";
import { FilesWorkspace } from "../../features/files/FilesWorkspace";
import { HistoryWorkspace } from "../../features/history/HistoryWorkspace";
import { desktopApi, humanizeError } from "../../lib/desktop";

const nav: { view: AppView; label: string; icon: typeof Home }[] = [
  { view: "overview", label: "项目概览", icon: Home }, { view: "project-document", label: "项目书", icon: BookOpenText }, { view: "feedback", label: "反馈", icon: MessageSquareText }, { view: "files", label: "资料与笔记", icon: FileStack }, { view: "history", label: "历史", icon: Clock3 }
];

export function WorkspaceShell() {
  const { project, view, navigate, closeProject, theme, setTheme } = useAppStore(); const [search, setSearch] = useState(false); const [windowError, setWindowError] = useState(""); const [openingWindow, setOpeningWindow] = useState(false);
  async function archive() { if (!project || !window.confirm("归档不会删除任何文件。确定要归档这个学习项目吗？")) return; if (!desktopApi.isNative()) return window.alert("项目已归档，所有文件保持不变。"); try { useAppStore.getState().openProject(await desktopApi.archiveProject(project.path)); } catch (cause) { window.alert(humanizeError(cause)); } }
  async function reveal() { if (!project) return; if (!desktopApi.isNative()) return window.alert(`项目目录：${project.path}`); try { await desktopApi.revealProject(project.path); } catch (cause) { window.alert(humanizeError(cause)); } }
  async function openProjectWindow() { if (openingWindow) return; if (!desktopApi.isNative()) return window.alert("桌面版支持在独立窗口中打开另一个项目。"); try { setWindowError(""); setOpeningWindow(true); await desktopApi.openProjectWindow(); } catch (cause) { setWindowError(humanizeError(cause)); } finally { setOpeningWindow(false); } }
  const active = view === "feedback-editor" ? "feedback" : view === "diff" ? "history" : view;
  return <div className="workspace">
    <aside className="sidebar">
      <button className="project-switcher"><div className="mini-monogram">研</div><div><strong>{project?.name}</strong><span>学习项目</span></div><ChevronDown size={15} /></button>
      <nav aria-label="项目导航">{nav.map(item => <button key={item.view} className={active === item.view ? "active" : ""} onClick={() => navigate(item.view)}><item.icon size={17} />{item.label}</button>)}</nav>
      <div className="sidebar-spacer" />
      <button className="feedback-action" onClick={() => navigate("feedback-editor")}><Plus size={17} />记录反馈</button>
      <div className="sidebar-bottom">{windowError && <span className="sidebar-error">{windowError}</span>}<button onClick={openProjectWindow} disabled={openingWindow}><AppWindow size={16} />{openingWindow ? "正在打开…" : "在新窗口打开项目"}</button><button onClick={archive}><Archive size={16} />归档项目</button><button onClick={closeProject}><X size={16} />关闭项目</button></div>
    </aside>
    <section className="workarea">
      <header className="topbar"><div className="breadcrumbs"><span>学习机</span><b>/</b><strong>{project?.name}</strong></div><div className="top-actions">{search ? <div className="search-box"><Search size={15} /><input autoFocus placeholder="搜索项目文件" /><button onClick={() => setSearch(false)}><X size={14}/></button></div> : <button aria-label="搜索" onClick={() => setSearch(true)}><Search size={17} /></button>}<button aria-label="打开项目文件夹" onClick={reveal}><FolderOpen size={17} /></button><button aria-label="切换主题" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button><button aria-label="设置"><Settings2 size={17} /></button></div></header>
      <div className="content">{renderView(view)}</div>
    </section>
  </div>;
}

function renderView(view: AppView) {
  if (view === "project-document") return <ProjectDocument />;
  if (view === "feedback" || view === "feedback-editor") return <FeedbackWorkspace editing={view === "feedback-editor"} />;
  if (view === "files" || view === "markdown-editor") return <FilesWorkspace />;
  if (view === "history" || view === "diff") return <HistoryWorkspace showDiff={view === "diff"} />;
  return <Overview />;
}
