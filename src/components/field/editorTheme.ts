import { EditorView } from "@codemirror/view";

/**
 * 跨 feature 共享的 CodeMirror 基础主题（颜色全部走 CSS 变量）。
 * 剧本语法高亮等专属定义留在各 feature 内部。
 */
export const anvilTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--bg-app)",
    color: "var(--fg-primary)",
    fontSize: "13px",
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.7",
  },
  ".cm-content": {
    caretColor: "var(--accent-gold)",
    padding: "12px 0",
  },
  ".cm-line": { padding: "0 12px" },
  ".cm-gutters": {
    backgroundColor: "var(--bg-app)",
    color: "var(--fg-muted)",
    border: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--bg-surface) 60%, transparent)",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--bg-raised)",
  },
  "&.cm-focused .cm-cursor": { borderLeftColor: "var(--accent-gold)" },
  "&.cm-focused": { outline: "none" },
});
