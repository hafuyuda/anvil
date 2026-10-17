import { EditorView } from "@codemirror/view";

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
