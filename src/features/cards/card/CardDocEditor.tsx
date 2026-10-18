import { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
  highlightActiveLine,
} from "@codemirror/view";
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ipc } from "../../../core/ipc";
import { anvilTheme } from "../../../components/field/editorTheme";

interface Props {
  cardId: string;
}

/** 卡牌附属文档编辑器：纯 Markdown 源码，自动保存，支持预览。 */
export function CardDocEditor({ cardId }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const lastSavedRef = useRef<string>("");

  // 挂载 + 加载文档
  useEffect(() => {
    if (!hostRef.current) return;
    let cancelled = false;
    let view: EditorView | null = null;

    setLoaded(false);
    setDirty(false);

    const extensions = [
      lineNumbers(),
      history(),
      drawSelection(),
      highlightActiveLine(),
      EditorView.lineWrapping,
      anvilTheme,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          setContent(update.state.doc.toString());
          setDirty(true);
        }
      }),
    ];

    ipc
      .loadDoc(cardId)
      .catch(() => null)
      .then((c) => {
        if (cancelled || !hostRef.current) return;
        const initial = c ?? "";
        lastSavedRef.current = initial;
        setContent(initial);
        view = new EditorView({
          state: EditorState.create({ doc: initial, extensions }),
          parent: hostRef.current,
        });
        viewRef.current = view;
        setLoaded(true);
      });

    return () => {
      cancelled = true;
      view?.destroy();
      viewRef.current = null;
    };
  }, [cardId]);

  // 自动保存：800ms 防抖，>500 行时 1500ms；内容未变跳过
  useEffect(() => {
    if (!loaded || !dirty) return;
    if (content === lastSavedRef.current) return;
    const lineCount = content.split("\n").length;
    const delay = lineCount > 500 ? 1500 : 800;
    const handle = setTimeout(async () => {
      setSaving(true);
      try {
        await ipc.saveDoc(cardId, content);
        lastSavedRef.current = content;
        setDirty(false);
      } catch {
        // 保留 dirty，下次重试
      } finally {
        setSaving(false);
      }
    }, delay);
    return () => clearTimeout(handle);
  }, [content, dirty, loaded, cardId]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "2px 4px",
          flexShrink: 0,
        }}
      >
        <button
          className="btn btn-ghost"
          onClick={() => {
            setMode("edit");
            viewRef.current?.focus();
          }}
          style={{
            fontSize: 11,
            fontWeight: mode === "edit" ? 600 : 400,
            color:
              mode === "edit" ? "var(--fg-primary)" : "var(--fg-secondary)",
            borderBottom:
              mode === "edit"
                ? "2px solid var(--accent-gold)"
                : "2px solid transparent",
            borderRadius: 0,
            padding: "2px 8px",
          }}
        >
          编辑
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setMode("preview")}
          style={{
            fontSize: 11,
            fontWeight: mode === "preview" ? 600 : 400,
            color:
              mode === "preview" ? "var(--fg-primary)" : "var(--fg-secondary)",
            borderBottom:
              mode === "preview"
                ? "2px solid var(--accent-gold)"
                : "2px solid transparent",
            borderRadius: 0,
            padding: "2px 8px",
          }}
        >
          预览
        </button>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 11,
            color: saving
              ? "var(--accent-flame)"
              : dirty
                ? "var(--warning)"
                : "var(--fg-muted)",
          }}
        >
          {saving ? "保存中…" : dirty ? "有未保存修改" : "已保存"}
        </span>
      </div>
      {/* 编辑区与预览叠加：编辑器保持挂载，切回时光标 / 滚动不丢 */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div
          ref={hostRef}
          style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        />
        {mode === "preview" && (
          <div
            className="card-doc-preview"
            style={{
              position: "absolute",
              inset: 0,
              overflowY: "auto",
              background: "var(--bg-app)",
              padding: 12,
            }}
          >
            {content.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <div
                style={{
                  color: "var(--fg-muted)",
                  fontSize: 12,
                  textAlign: "center",
                  paddingTop: 40,
                }}
              >
                还没有内容
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
