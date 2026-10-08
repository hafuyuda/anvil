import { useEffect, useRef } from "react";
import type { ScriptLine } from "./types";

const TYPE_LABELS: { value: ScriptLine["type"]; label: string }[] = [
  { value: "narration", label: "旁白" },
  { value: "say", label: "对白" },
  { value: "action", label: "动作" },
  { value: "bg", label: "背景" },
  { value: "sfx", label: "音效" },
];

interface Props {
  line: ScriptLine;
  handleProps: Record<string, unknown>;
  isDragging?: boolean;
  autoFocus?: boolean;
  onChange: (next: ScriptLine) => void;
  onDelete: () => void;
  onEnter: () => void;
}

export function ScriptLineCard({
  line,
  handleProps,
  isDragging,
  autoFocus,
  onChange,
  onDelete,
  onEnter,
}: Props) {
  const primaryRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus && primaryRef.current) {
      primaryRef.current.focus();
    }
  }, [autoFocus]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    }
  }

  function switchType(newType: ScriptLine["type"]) {
    if (newType === line.type) return;
    const text = "text" in line ? line.text : "";
    // 保留可保留的字段，其余置空
    switch (newType) {
      case "narration":
        onChange({ type: "narration", text });
        return;
      case "say":
        onChange({ type: "say", speaker: "", text });
        return;
      case "action":
        onChange({ type: "action", text });
        return;
      case "bg":
        onChange({ type: "bg", image: "" });
        return;
      case "sfx":
        onChange({ type: "sfx", file: "" });
        return;
    }
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: 8,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.4)" : "none",
        transition: "box-shadow 0.12s",
        alignItems: "flex-start",
      }}
    >
      <div
        {...handleProps}
        title="拖动排序"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          color: "var(--fg-muted)",
          userSelect: "none",
          fontSize: 13,
          letterSpacing: -2,
          padding: "4px 0",
          flexShrink: 0,
          touchAction: "none",
        }}
      >
        ⋮⋮
      </div>

      <select
        className="select"
        value={line.type}
        onChange={(e) => switchType(e.target.value as ScriptLine["type"])}
        style={{ width: 72, flexShrink: 0, fontSize: 12 }}
      >
        {TYPE_LABELS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 6 }}>
        {line.type === "narration" && (
          <input
            ref={primaryRef}
            className="input"
            value={line.text}
            onChange={(e) => onChange({ ...line, text: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="旁白内容"
            style={{ fontSize: 12 }}
          />
        )}

        {line.type === "say" && (
          <>
            <input
              ref={primaryRef}
              className="input"
              value={line.speaker}
              onChange={(e) => onChange({ ...line, speaker: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="角色"
              style={{ width: 100, flexShrink: 0, fontSize: 12 }}
            />
            <input
              className="input"
              value={line.portrait ?? ""}
              onChange={(e) =>
                onChange({
                  ...line,
                  portrait: e.target.value || undefined,
                })
              }
              onKeyDown={handleKeyDown}
              placeholder="表情"
              style={{ width: 80, flexShrink: 0, fontSize: 12 }}
            />
            <input
              className="input"
              value={line.text}
              onChange={(e) => onChange({ ...line, text: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="对白内容"
              style={{ flex: 1, fontSize: 12 }}
            />
          </>
        )}

        {line.type === "action" && (
          <input
            ref={primaryRef}
            className="input"
            value={line.text}
            onChange={(e) => onChange({ ...line, text: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="动作描述"
            style={{ fontSize: 12, fontStyle: "italic" }}
          />
        )}

        {line.type === "bg" && (
          <input
            ref={primaryRef}
            className="input"
            value={line.image}
            onChange={(e) => onChange({ ...line, image: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="图片路径（assets/images/...）"
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          />
        )}

        {line.type === "sfx" && (
          <input
            ref={primaryRef}
            className="input"
            value={line.file}
            onChange={(e) => onChange({ ...line, file: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="音效文件名"
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          />
        )}
      </div>

      <button
        className="btn btn-ghost"
        onClick={onDelete}
        title="删除此行"
        style={{
          padding: "2px 8px",
          fontSize: 12,
          color: "var(--danger)",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
