import { useEffect, useMemo, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  placeholder,
} from "@codemirror/view";
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { search, searchKeymap } from "@codemirror/search";
import { parseScript } from "../parser";
import { ScriptPreview } from "./ScriptPreview";
import { anvilTheme, anvilHighlighting } from "./cm/theme";
import { storyLanguage } from "./cm/language";
import { loadCursor, saveCursor } from "./cm/cursorCache";

interface Props {
  content: string;
  onChange: (c: string) => void;
  /** 用于跨挂载恢复光标（阶段 C 启用） */
  cardId: string;
}

export function ScriptSourceEditor({ content, onChange, cardId }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 挂载一次
  useEffect(() => {
    if (!hostRef.current) return;
    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      drawSelection(),
      highlightActiveLine(),
      EditorView.lineWrapping,
      anvilTheme,
      storyLanguage,
      anvilHighlighting,
      placeholder(
        "> 炉火噼啪作响。\n\n**布洛克**（neutral）：坐吧，旅人。\n\n*格蕾塔从炉边跑过来。*",
      ),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      search({ top: true }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
    ];
    const view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions,
      }),
      parent: hostRef.current,
    });
    viewRef.current = view;

    // 恢复上次卸载时的光标与滚动位置
    const saved = loadCursor(cardId);
    if (saved) {
      const maxPos = view.state.doc.length;
      view.dispatch({
        selection: {
          anchor: Math.min(saved.anchor, maxPos),
          head: Math.min(saved.head, maxPos),
        },
      });
      view.scrollDOM.scrollTop = saved.scrollTop;
    }

    return () => {
      const sel = view.state.selection.main;
      saveCursor(cardId, {
        anchor: sel.anchor,
        head: sel.head,
        scrollTop: view.scrollDOM.scrollTop,
      });
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外部 content 变化时同步（避免自触发死循环）
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === content) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: content },
    });
  }, [content]);

  const parsed = useMemo(() => parseScript(content), [content]);

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
          padding: "4px 12px",
          fontSize: 11,
          color: "var(--fg-muted)",
          background: "var(--bg-app)",
          borderBottom: "1px solid var(--border-subtle)",
          fontFamily: "var(--font-mono)",
          flexShrink: 0,
          lineHeight: 1.6,
        }}
      >
        {"> 旁白"} · {"**角色**（表情）：对白"} · {"*动作*"} · {"@bg 路径"} ·{" "}
        {"@bgm 文件"} · {"@sfx 文件"} · {"-> 场景名"} · {"{条件: 文本}"} ·{" "}
        {"~ 变量 = 值"} · {"<>"}
        <div style={{ color: "var(--fg-muted)", fontSize: 10 }}>
          顶部 frontmatter 可写：
          <span style={{ color: "var(--fg-secondary)" }}>
            {" "}
            bg · bgm · is_ending · ending_name
          </span>
        </div>
        <div style={{ color: "var(--fg-muted)", fontSize: 10 }}>
          说话人按名字匹配项目中的卡。立绘从卡的{" "}
          <span style={{ color: "var(--fg-secondary)" }}>
            portrait_&lt;表情&gt;
          </span>{" "}
          image 字段读取。
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            ref={hostRef}
            style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
          />
        </div>

        <div
          style={{
            width: 320,
            borderLeft: "1px solid var(--border-subtle)",
            overflowY: "auto",
            background: "var(--bg-panel)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "6px 12px",
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            解析预览（{parsed.lines.length} 行）
          </div>
          <ScriptPreview script={parsed} />
        </div>
      </div>
    </div>
  );
}
