import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { scrollPastEnd as scrollPastEndExtension } from "@codemirror/view";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownEditor({ value, onChange, preview, scrollPastEnd = false }: { value: string; onChange: (value: string) => void; preview: boolean; scrollPastEnd?: boolean }) {
  return preview
    ? <div className="markdown-preview" role="region" aria-label="文档预览" tabIndex={0}><ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown></div>
    : <div className="markdown-editor-region" role="region" aria-label="Markdown 编辑器"><CodeMirror className="code-editor" value={value} onChange={onChange} extensions={[markdown(), ...(scrollPastEnd ? [scrollPastEndExtension()] : [])]} basicSetup={{ lineNumbers: false, foldGutter: false }} /></div>;
}
