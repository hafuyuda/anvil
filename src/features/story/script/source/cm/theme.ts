import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// 基础主题已提升到共享位置，re-export 保持本 feature 内部引用不变
export { anvilTheme } from "../../../../../components/field/editorTheme";

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
