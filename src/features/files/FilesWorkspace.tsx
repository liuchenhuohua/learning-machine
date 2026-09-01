import { ChevronDown, ChevronRight, FileCode2, FilePlus2, FileText, Folder, FolderOpen, FolderPlus, MoreHorizontal, Pencil, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { MarkdownEditor } from "../../components/editor/MarkdownEditor";
import { desktopApi, humanizeError } from "../../lib/desktop";
import { useAppStore } from "../../stores/appStore";
import type { ProjectFile } from "../../types/domain";

const demoDocument = "# 阅读理解复盘\n\n## 证据定位\n\n- 先标记题干限定词\n- 回到原文寻找同义替换\n";
const demoSelection: ProjectFile = { name: "阅读理解.md", path: "notes/英语/阅读理解.md", kind: "file", extension: "md" };

export function FilesWorkspace() {
  const project = useAppStore(state => state.project);
  const native = desktopApi.isNative();
  const [selected, setSelected] = useState<ProjectFile | null>(native ? null : demoSelection);
  const [content, setContent] = useState(native ? "" : demoDocument);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [modifiedAt, setModifiedAt] = useState<string>();
  const [error, setError] = useState("");
  const [dragged, setDragged] = useState<ProjectFile | null>(null);
  const targetDirectory = useMemo(() => selected ? selected.kind === "directory" ? selected.path : parentPath(selected.path) : "notes", [selected]);

  const refresh = useCallback(() => {
    if (!project || !native) return;
    return desktopApi.listFiles(project.path).then(setFiles).catch(cause => setError(humanizeError(cause)));
  }, [project?.path, native]);

  useEffect(() => {
    if (native) { setSelected(null); setContent(""); setModifiedAt(undefined); }
    refresh();
  }, [project?.path, native, refresh]);

  async function openEntry(entry: ProjectFile) {
    setSelected(entry); setError(""); setModifiedAt(undefined);
    if (entry.kind === "directory" || entry.extension?.toLowerCase() !== "md") { setContent(""); return; }
    if (!project || !native) return;
    try {
      const document = await desktopApi.readDocument(project.path, entry.path);
      setContent(document.content); setModifiedAt(document.modifiedAt);
    } catch (cause) { setContent(""); setError(humanizeError(cause)); }
  }

  async function createMarkdown() {
    const raw = window.prompt(`在 ${targetDirectory} 中新建 Markdown`, "新笔记.md");
    if (!raw || !project || !native) return;
    const name = raw.toLowerCase().endsWith(".md") ? raw : `${raw}.md`;
    const path = `${targetDirectory}/${name}`;
    try {
      await desktopApi.createEntry(project.path, path, "file");
      await refresh();
      await openEntry({ name, path, kind: "file", extension: "md" });
    } catch (cause) { setError(humanizeError(cause)); }
  }

  async function createFolder() {
    const name = window.prompt(`在 ${targetDirectory} 中新建文件夹`);
    if (!name || !project || !native) return;
    const path = `${targetDirectory}/${name}`;
    try {
      await desktopApi.createEntry(project.path, path, "directory");
      await refresh();
      setSelected({ name, path, kind: "directory", children: [] });
      setContent("");
    } catch (cause) { setError(humanizeError(cause)); }
  }

  async function importFiles() {
    if (!project || !native) return;
    try {
      for (const path of await desktopApi.pickFiles()) await desktopApi.importFile(project.path, path, targetDirectory);
      await refresh();
    } catch (cause) { setError(humanizeError(cause)); }
  }

  async function renameSelected() {
    if (!project || !selected || isRootDirectory(selected.path) || !native) return;
    const next = window.prompt("重命名为", selected.name);
    if (!next) return;
    try {
      await desktopApi.renameEntry(project.path, selected.path, next);
      const path = `${parentPath(selected.path)}/${next}`;
      setSelected({ ...selected, name: next, path, extension: next.includes(".") ? next.split(".").pop()?.toLowerCase() : undefined });
      await refresh();
    } catch (cause) { setError(humanizeError(cause)); }
  }

  async function deleteSelected() {
    if (!project || !selected || isRootDirectory(selected.path) || !native || !window.confirm(`确定删除 ${selected.path}？此操作无法撤销。`)) return;
    try {
      await desktopApi.deleteEntry(project.path, selected.path);
      setSelected(null); setContent(""); setModifiedAt(undefined);
      await refresh();
    } catch (cause) { setError(humanizeError(cause)); }
  }

  async function moveEntry(source: ProjectFile, destination: ProjectFile) {
    if (!project || !native || destination.kind !== "directory" || !canMoveInto(source, destination)) return;
    try {
      setError("");
      const path = await desktopApi.moveEntry(project.path, source.path, destination.path);
      setSelected(current => current?.path === source.path ? { ...current, path } : current);
      await refresh();
    } catch (cause) {
      setError(humanizeError(cause));
    } finally {
      setDragged(null);
    }
  }

  async function persist() {
    if (!project || !native || selected?.extension?.toLowerCase() !== "md") return;
    try {
      const document = await desktopApi.writeDocument(project.path, selected.path, content, modifiedAt);
      setModifiedAt(document.modifiedAt);
    } catch (cause) { setError(humanizeError(cause)); }
  }

  const displayedFiles = native ? files : demoFiles;
  return <div className="files-page">
    <aside className="file-pane">
      <div className="file-pane-head"><div><p className="eyebrow">PROJECT FILES</p><h2>资料与笔记</h2></div><button title="刷新文件树" onClick={refresh}><MoreHorizontal size={17}/></button></div>
      <div className="file-tools"><button title="新建 Markdown" onClick={createMarkdown}><FilePlus2 size={16}/></button><button title="新建文件夹" onClick={createFolder}><FolderPlus size={16}/></button><button title="导入文件" onClick={importFiles}><Upload size={16}/></button><span title={targetDirectory}>新建于：{targetDirectory}</span></div>
      {error && <div className="error-banner file-error">{error}</div>}
      <div className="file-tree"><FileNodes files={displayedFiles} selected={selected?.path ?? ""} dragged={dragged} movable={native} onSelect={openEntry} onDragStart={setDragged} onDragEnd={() => setDragged(null)} onMove={moveEntry}/></div>
      <div className="file-pane-foot"><FolderOpen size={15}/>仅管理 materials 与 notes</div>
    </aside>
    <section className="file-editor">
      <FileHeader selected={selected} onRename={renameSelected} onDelete={deleteSelected} onSave={persist}/>
      <FileContent projectRoot={project?.path ?? ""} selected={selected} content={content} onChange={setContent} native={native}/>
    </section>
  </div>;
}

function FileHeader({ selected, onRename, onDelete, onSave }: { selected: ProjectFile | null; onRename: () => void; onDelete: () => void; onSave: () => void }) {
  const editable = selected && !isRootDirectory(selected.path);
  return <header><div className="path-crumb">{selected?.path.split("/").filter(Boolean).map((part, index) => <span key={`${part}-${index}`}>{index > 0 && <b>/</b>}{part}</span>) ?? <span>未选择</span>}</div><div>{selected && <span className="saved-state">磁盘文件</span>}{editable && <><button title="重命名" onClick={onRename}><Pencil size={15}/></button><button title="删除" onClick={onDelete}><Trash2 size={15}/></button></>}{selected?.extension?.toLowerCase() === "md" && <button className="button secondary small" onClick={onSave}>保存</button>}</div></header>;
}

function FileContent({ projectRoot, selected, content, onChange, native }: { projectRoot: string; selected: ProjectFile | null; content: string; onChange: (value: string) => void; native: boolean }) {
  if (!selected) return <EmptyFileState title="选择一个文件或文件夹" detail="选择目录后，新建和导入操作会放入该目录。"/>;
  if (selected.kind === "directory") return <EmptyFileState title={selected.name} detail={`当前目标文件夹：${selected.path}`}/>;
  const extension = selected.extension?.toLowerCase();
  if (extension === "pdf" && native) return <PdfReader projectRoot={projectRoot} path={selected.path}/>;
  if (extension === "md") return <MarkdownEditor value={content} onChange={onChange} preview={false}/>;
  return <EmptyFileState title={selected.name} detail="当前版本暂不支持预览此文件类型。"/>;
}

function PdfReader({ projectRoot, path }: { projectRoot: string; path: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    desktopApi.readBinaryDocument(projectRoot, path).then(bytes => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      setUrl(objectUrl);
    }).catch(cause => { if (!cancelled) setError(humanizeError(cause)); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [projectRoot, path]);
  if (error) return <EmptyFileState title="PDF 打开失败" detail={error}/>;
  if (!url) return <EmptyFileState title="正在打开 PDF…" detail={path}/>;
  return <iframe className="pdf-reader" title="PDF 阅读器" src={url}/>;
}

function EmptyFileState({ title, detail }: { title: string; detail: string }) { return <div className="file-empty"><FileText size={34}/><strong>{title}</strong><span>{detail}</span></div>; }

type FileTreeProps = {
  files: ProjectFile[];
  selected: string;
  dragged: ProjectFile | null;
  movable: boolean;
  onSelect: (entry: ProjectFile) => void;
  onDragStart: (entry: ProjectFile) => void;
  onDragEnd: () => void;
  onMove: (source: ProjectFile, destination: ProjectFile) => void;
};

function FileNodes(props: FileTreeProps) {
  const { files, selected, dragged, movable, onSelect, onDragStart, onDragEnd } = props;
  return <>{files.map(file => file.kind === "directory" ? <FolderNode key={file.path} file={file} {...props}/> : <button
    key={file.path}
    className={`tree-file ${selected === file.path ? "active" : ""} ${dragged?.path === file.path ? "dragging" : ""}`}
    draggable={movable}
    onClick={() => onSelect(file)}
    onDragStart={event => beginDrag(event, file, onDragStart)}
    onDragEnd={onDragEnd}
  >{file.extension?.toLowerCase() === "md" ? <FileCode2 size={15}/> : <FileText size={15}/>} {file.name}</button>)}</>;
}

function FolderNode({ file, files: _files, selected, dragged, movable, onSelect, onDragStart, onDragEnd, onMove }: FileTreeProps & { file: ProjectFile }) {
  const [expanded, setExpanded] = useState(true);
  const [dropTarget, setDropTarget] = useState(false);
  const draggable = movable && !isRootDirectory(file.path);
  const acceptsDrop = Boolean(dragged && canMoveInto(dragged, file));
  function toggle() { onSelect(file); setExpanded(value => !value); }
  function dragOver(event: DragEvent<HTMLButtonElement>) {
    if (!acceptsDrop) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(true);
  }
  function dragLeave(event: DragEvent<HTMLButtonElement>) {
    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDropTarget(false);
  }
  function drop(event: DragEvent<HTMLButtonElement>) {
    if (!dragged || !acceptsDrop) return;
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(false);
    onMove(dragged, file);
  }
  return <div className="tree-folder"><button
    className={`${selected === file.path ? "active" : ""} ${dragged?.path === file.path ? "dragging" : ""} ${dropTarget ? "drop-target" : ""}`}
    aria-expanded={expanded}
    draggable={draggable}
    onClick={toggle}
    onDragStart={event => beginDrag(event, file, onDragStart)}
    onDragEnd={() => { setDropTarget(false); onDragEnd(); }}
    onDragOver={dragOver}
    onDragLeave={dragLeave}
    onDrop={drop}
  >{expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}<Folder size={15}/>{file.name}</button>{expanded && <div>{file.children && <FileNodes files={file.children} selected={selected} dragged={dragged} movable={movable} onSelect={onSelect} onDragStart={onDragStart} onDragEnd={onDragEnd} onMove={onMove}/>}</div>}</div>;
}

function beginDrag(event: DragEvent<HTMLElement>, entry: ProjectFile, onDragStart: (entry: ProjectFile) => void) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", entry.path);
  onDragStart(entry);
}

function canMoveInto(source: ProjectFile, destination: ProjectFile) {
  if (destination.kind !== "directory" || isRootDirectory(source.path)) return false;
  if (source.path === destination.path || parentPath(source.path) === destination.path) return false;
  return source.kind !== "directory" || !destination.path.startsWith(`${source.path}/`);
}

function parentPath(path: string) { return path.split("/").slice(0, -1).join("/"); }
function isRootDirectory(path: string) { return path === "materials" || path === "notes"; }

const demoFiles: ProjectFile[] = [
  { name: "materials", path: "materials", kind: "directory", children: [{ name: "数学强化讲义.pdf", path: "materials/数学强化讲义.pdf", kind: "file", extension: "pdf" }] },
  { name: "notes", path: "notes", kind: "directory", children: [{ name: "英语", path: "notes/英语", kind: "directory", children: [demoSelection] }] }
];
