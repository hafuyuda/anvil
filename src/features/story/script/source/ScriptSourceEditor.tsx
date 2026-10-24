import { useEffect, useMemo, useRef, useState } from "react";
import { EditorSelection, EditorState } from "@codemirror/state";
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
import { autocompletion } from "@codemirror/autocomplete";
import { ipc } from "../../../../core/ipc";
import { useProjectStore } from "../../../../stores/projectStore";
import { parseScript } from "../parser";
import { ScriptPreview } from "./ScriptPreview";
import { anvilTheme, anvilHighlighting } from "./cm/theme";
import { storyLanguage } from "./cm/language";
import { loadCursor, saveCursor } from "./cm/cursorCache";
import {
  EMPTY_SOURCES,
  storyCompletions,
  type CompletionSources,
} from "./cm/completions";

interface Props {
  content: string;
  onChange: (c: string) => void;
  /** 用于跨挂载恢复光标 */
  cursorKey: string;
  /** knot 名（-> 补全用） */
  knotNames: string[];
  /** 剧本变量名（~ / {} 补全用） */
  varNames: string[];
  /** 光标所在行（0-based 源码行索引），用于「当前 knot」显示 */
  onCursorLine?: (line: number | null) => void;
  /** 外部请求定位到某行（knot 大纲 / 搜索命中点击） */
  scrollToLine?: { line: number; nonce: number } | null;
}

function wrapSelection(view: EditorView, before: string, after: string) {
  const { from, to } = view.state.selection.main;
  const sel = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: before + sel + after },
    selection: EditorSelection.range(
      from + before.length,
      from + before.length + sel.length,
    ),
  });
  return true;
}

export function ScriptSourceEditor({
  content,
  onChange,
  cursorKey,
  knotNames,
  varNames,
  onCursorLine,
  scrollToLine,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorLineRef = useRef(onCursorLine);
  onCursorLineRef.current = onCursorLine;

  const cards = useProjectStore((s) => s.cards);
  const sourcesRef = useRef<CompletionSources>({ ...EMPTY_SOURCES });

  // 同步补全数据：说话人（卡名）、knot 名、变量名随 store / props 更新
  useEffect(() => {
    sourcesRef.current.speakers = cards.map((c) => c.name);
    sourcesRef.current.knotNames = knotNames;
    sourcesRef.current.variables = varNames;
  }, [cards, knotNames, varNames]);

  // 资源路径挂载时各拉一次，失败静默为空列表
  useEffect(() => {
    ipc
      .listImages()
      .then((l) => {
        sourcesRef.current.images = l;
      })
      .catch(() => {});
    ipc
      .listAudios()
      .then((l) => {
        sourcesRef.current.audios = l;
      })
      .catch(() => {});
  }, []);

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
      keymap.of([
        { key: "Mod-b", run: (v) => wrapSelection(v, "**", "**") },
        { key: "Mod-i", run: (v) => wrapSelection(v, "*", "*") },
        {
          key: "Mod-Enter",
          run: (v) => {
            v.dispatch(v.state.replaceSelection("-> "));
            return true;
          },
        },
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
      ]),
      search({ top: true }),
      autocompletion({
        override: [storyCompletions(() => sourcesRef.current)],
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
        if (update.selectionSet || update.docChanged) {
          onCursorLineRef.current?.(
            update.state.doc.lineAt(update.state.selection.main.head).number -
              1,
          );
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
    const saved = loadCursor(cursorKey);
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
      saveCursor(cursorKey, {
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

  // 外部请求定位到某行（放在挂载 effect 之后，确保 view 已就绪）
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !scrollToLine) return;
    const lineNo = scrollToLine.line + 1;
    if (lineNo < 1 || lineNo > view.state.doc.lines) return;
    const pos = view.state.doc.line(lineNo).from;
    view.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    view.focus();
  }, [scrollToLine]);

  const parsed = useMemo(() => parseScript(content), [content]);
  const [panelTab, setPanelTab] = useState<"preview" | "outline">("preview");

  // 大纲：从 content 推导（不读 view state），行号为 0-based 源码行索引
  const outline = useMemo(() => {
    const out: {
      line: number;
      kind: "jump" | "condition" | "assign";
      text: string;
    }[] = [];
    content.split(/\r?\n/).forEach((t, i) => {
      const s = t.trim();
      if (s.startsWith("->"))
        out.push({ line: i, kind: "jump", text: s.slice(2).trim() });
      else if (s.startsWith("{"))
        out.push({ line: i, kind: "condition", text: s });
      else if (s.startsWith("~"))
        out.push({ line: i, kind: "assign", text: s.slice(1).trim() });
    });
    return out;
  }, [content]);

  function jumpToLine(line: number) {
    const view = viewRef.current;
    if (!view) return;
    const pos = view.state.doc.line(line + 1).from;
    view.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    view.focus();
  }

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
        {"@bgm 文件"} · {"@sfx 文件"} · {"@scene 场景卡"} ·{" "}
        {"@actor 角色卡"} · {"-> knot / END"} · {"{条件: 文本}"} ·{" "}
        {"~ 变量 = 值"} · {"<>"}
        <div style={{ color: "var(--fg-muted)", fontSize: 10 }}>
          结构行：
          <span style={{ color: "var(--fg-secondary)" }}>
            {" "}
            === knot 名 · VAR 变量 = 值 · * 选项 · - 汇合
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

      <div className="fill">
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
              display: "flex",
              gap: 2,
              padding: "2px 12px",
              borderBottom: "1px solid var(--border-subtle)",
              alignItems: "center",
            }}
          >
            <PanelTab
              active={panelTab === "preview"}
              onClick={() => setPanelTab("preview")}
            >
              预览
            </PanelTab>
            <PanelTab
              active={panelTab === "outline"}
              onClick={() => setPanelTab("outline")}
            >
              大纲
            </PanelTab>
            <div style={{ flex: 1 }} />
            <span
              style={{
                fontSize: 10,
                color: "var(--fg-muted)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {panelTab === "preview"
                ? `${parsed.lines.length} 行`
                : `${outline.length} 项`}
            </span>
          </div>
          {panelTab === "preview" ? (
            <ScriptPreview script={parsed} />
          ) : (
            <OutlineList outline={outline} onJump={jumpToLine} />
          )}
        </div>
      </div>
    </div>
  );
}

function PanelTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-ghost"
      onClick={onClick}
      style={{
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        borderBottom: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
        padding: "4px 8px",
      }}
    >
      {children}
    </button>
  );
}

const OUTLINE_KIND_META = {
  jump: { label: "跳转", color: "var(--accent-flame)" },
  condition: { label: "条件", color: "var(--accent-gold)" },
  assign: { label: "赋值", color: "var(--accent-copper)" },
} as const;

function OutlineList({
  outline,
  onJump,
}: {
  outline: { line: number; kind: "jump" | "condition" | "assign"; text: string }[];
  onJump: (line: number) => void;
}) {
  if (outline.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          color: "var(--fg-muted)",
          fontSize: 12,
          padding: 24,
        }}
      >
        没有跳转 / 条件 / 赋值行
      </div>
    );
  }

  const groups = (["jump", "condition", "assign"] as const)
    .map((kind) => ({
      kind,
      items: outline.filter((o) => o.kind === kind),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div style={{ padding: "4px 0" }}>
      {groups.map((g) => (
        <div key={g.kind}>
          <div
            style={{
              padding: "6px 12px 2px",
              fontSize: 10,
              color: OUTLINE_KIND_META[g.kind].color,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {OUTLINE_KIND_META[g.kind].label}（{g.items.length}）
          </div>
          {g.items.map((item) => (
            <button
              key={`${item.kind}-${item.line}`}
              className="btn btn-ghost"
              onClick={() => onJump(item.line)}
              title={`跳到第 ${item.line + 1} 行`}
              style={{
                display: "flex",
                gap: 8,
                width: "100%",
                textAlign: "left",
                padding: "3px 12px",
                borderRadius: 0,
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  fontFamily: "var(--font-mono)",
                  flexShrink: 0,
                  minWidth: 28,
                  textAlign: "right",
                }}
              >
                {item.line + 1}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--fg-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.text || "（空）"}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
