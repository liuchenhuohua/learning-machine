import { Columns2, Rows3 } from "lucide-react";
import { useMemo, useState } from "react";
import { buildSplitRows, parseUnifiedDiff, type DiffLine } from "./diffParser";
import type { GitChangedFile } from "../../types/domain";

export function DiffViewer({ file, raw }: { file: GitChangedFile; raw: string }) {
  const [mode, setMode] = useState<"unified" | "split">("unified");
  const diff = useMemo(() => parseUnifiedDiff(raw), [raw]);
  return <section className="diff-viewer" aria-label="文件差异">
    <header className="diff-toolbar"><div><strong>{file.path}</strong><span>{statusLabel[file.status]} · <em>+{diff.additions}</em> <b>-{diff.deletions}</b></span></div><div className="diff-mode"><button className={mode === "unified" ? "active" : ""} onClick={() => setMode("unified")}><Rows3 size={14}/>统一</button><button className={mode === "split" ? "active" : ""} onClick={() => setMode("split")}><Columns2 size={14}/>左右对照</button></div></header>
    <div className="diff-scroll">
      {diff.hunks.length === 0 ? <div className="history-empty"><strong>没有可显示的文本差异</strong><span>{raw ? "该文件可能是二进制文件或只有元数据变化。" : "这次提交没有改变该文件的文本内容。"}</span></div> : mode === "unified" ? diff.hunks.map(hunk => <div className="diff-hunk" key={hunk.header}><div className="hunk-header">{hunk.header}</div>{hunk.lines.map((line, index) => <UnifiedLine key={`${index}-${line.oldNumber}-${line.newNumber}`} line={line}/>)}</div>) : diff.hunks.map(hunk => <div className="diff-hunk split" key={hunk.header}><div className="hunk-header">{hunk.header}</div>{buildSplitRows(hunk.lines).map((row, index) => <div className="split-row" key={index}><SplitCell line={row.left} side="old"/><SplitCell line={row.right} side="new"/></div>)}</div>)}
    </div>
  </section>;
}

const statusLabel = { added: "新增文件", modified: "修改文件", deleted: "删除文件", renamed: "重命名" } as const;

function UnifiedLine({ line }: { line: DiffLine }) {
  return <div className={`diff-line ${line.kind}`}><span className="line-number">{line.oldNumber ?? ""}</span><span className="line-number">{line.newNumber ?? ""}</span><code><i>{line.kind === "addition" ? "+" : line.kind === "deletion" ? "-" : " "}</i>{line.content || " "}</code></div>;
}

function SplitCell({ line, side }: { line: DiffLine | null; side: "old" | "new" }) {
  if (!line) return <div className="split-cell empty"><span/><code> </code></div>;
  const number = side === "old" ? line.oldNumber : line.newNumber;
  return <div className={`split-cell ${line.kind}`}><span className="line-number">{number ?? ""}</span><code>{line.content || " "}</code></div>;
}
