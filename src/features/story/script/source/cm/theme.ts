import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

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

export const anvilHighlight = HighlightStyle.define([
  { tag: tags.heading, color: "var(--fg-secondary)", fontStyle: "italic" },
  { tag: tags.strong, color: "var(--accent-gold)", fontWeight: "600" },
  { tag: tags.emphasis, color: "var(--fg-secondary)", fontStyle: "italic" },
  { tag: tags.keyword, color: "var(--accent-flame)" },
  { tag: tags.meta, color: "var(--accent-steel)" },
  { tag: tags.operator, color: "var(--accent-copper)" },
  { tag: tags.brace, color: "var(--accent-gold)" },
  { tag: tags.atom, color: "var(--accent-steel)" },
  { tag: tags.propertyName, color: "var(--fg-secondary)" },
  { tag: tags.string, color: "var(--fg-primary)" },
  { tag: tags.punctuation, color: "var(--fg-muted)" },
]);

export const anvilHighlighting = syntaxHighlighting(anvilHighlight);
