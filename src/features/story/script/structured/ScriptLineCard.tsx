import { useEffect, useRef } from "react";
import type { ScriptLine } from "../types";
import { AudioSelect } from "../../../../components/field/AudioSelect";
import { AutoGrowTextarea } from "../../../../components/field/AutoGrowTextarea";

const TYPE_LABELS: { value: ScriptLine["type"]; label: string }[] = [
  { value: "knot", label: "knot" },
  { value: "var", label: "变量" },
  { value: "narration", label: "旁白" },
  { value: "say", label: "对白" },
  { value: "action", label: "动作" },
  { value: "bg", label: "背景" },
  { value: "bgm", label: "音乐" },
  { value: "sfx", label: "音效" },
  { value: "scene_ref", label: "场景卡" },
  { value: "actor_ref", label: "角色" },
  { value: "jump", label: "跳转" },
  { value: "choice", label: "选项" },
  { value: "gather", label: "汇合" },
  { value: "condition", label: "条件" },
  { value: "assign", label: "赋值" },
  { value: "glue", label: "粘合" },
];

interface Props {
  line: ScriptLine;
  handleProps: Record<string, unknown>;
  isDragging?: boolean;
  autoFocus?: boolean;
  /** knot 名（jump 下拉用，不含 END） */
  knotNames: string[];
  /** 剧本变量名（assign 下拉用） */
  varNames: string[];
  onChange: (next: ScriptLine) => void;
  onDelete: () => void;
  onEnter: () => void;
}

export function ScriptLineCard({
  line,
  handleProps,
  isDragging,
  autoFocus,
  knotNames,
  varNames,
  onChange,
  onDelete,
  onEnter,
}: Props) {
  const primaryRef = useRef<HTMLInputElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    if (autoFocus && primaryRef.current) {
      primaryRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (autoFocus && selectRef.current) {
      selectRef.current.focus();
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
      case "knot":
        onChange({ type: "knot", name: "" });
        return;
      case "var":
        onChange({ type: "var", key: "", literal: "" });
        return;
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
      case "bgm":
        onChange({ type: "bgm", file: "" });
        return;
      case "sfx":
        onChange({ type: "sfx", file: "" });
        return;
      case "scene_ref":
        onChange({ type: "scene_ref", cardName: "" });
        return;
      case "actor_ref":
        onChange({ type: "actor_ref", cardName: "" });
        return;
      case "jump":
        onChange({ type: "jump", target: "" });
        return;
      case "choice":
        onChange({ type: "choice", label: "" });
        return;
      case "gather":
        onChange({ type: "gather", text: "" });
        return;
      case "condition":
        onChange({ type: "condition", expr: "", text: "" });
        return;
      case "assign":
        onChange({ type: "assign", key: "", op: "=", value: "" });
        return;
      case "glue":
        onChange({ type: "glue" });
        return;
    }
  }

  const monoStyle: React.CSSProperties = {
    fontSize: 11,
    fontFamily: "var(--font-mono)",
  };

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
        style={{ width: 76, flexShrink: 0, fontSize: 12 }}
      >
        {TYPE_LABELS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 6 }}>
        {line.type === "knot" && (
          <input
            ref={primaryRef}
            className="input"
            value={line.name}
            onChange={(e) => onChange({ ...line, name: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="knot 名（如 铁匠铺 或 铁匠铺.夜）"
            style={{ ...monoStyle, flex: 1 }}
          />
        )}

        {line.type === "var" && (
          <>
            <input
              ref={primaryRef}
              className="input"
              value={line.key}
              onChange={(e) => onChange({ ...line, key: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="变量名"
              style={{ ...monoStyle, width: 120, flexShrink: 0 }}
            />
            <input
              className="input"
              value={line.literal}
              onChange={(e) => onChange({ ...line, literal: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="初始值（数字 / 字符串 / true）"
              style={{ ...monoStyle, flex: 1 }}
            />
          </>
        )}

        {line.type === "narration" && (
          <AutoGrowTextarea
            value={line.text}
            onChange={(v) => onChange({ ...line, text: v })}
            onEnter={onEnter}
            autoFocus={autoFocus}
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
            <AutoGrowTextarea
              value={line.text}
              onChange={(v) => onChange({ ...line, text: v })}
              onEnter={onEnter}
              placeholder="对白内容"
              style={{ flex: 1, fontSize: 12 }}
            />
          </>
        )}

        {line.type === "action" && (
          <AutoGrowTextarea
            value={line.text}
            onChange={(v) => onChange({ ...line, text: v })}
            onEnter={onEnter}
            autoFocus={autoFocus}
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
            style={monoStyle}
          />
        )}

        {line.type === "bgm" && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <AudioSelect
              value={line.file || null}
              onChange={(v) => onChange({ ...line, file: v ?? "" })}
              placeholder="— 无音乐 —"
            />
          </div>
        )}

        {line.type === "sfx" && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <AudioSelect
              value={line.file || null}
              onChange={(v) => onChange({ ...line, file: v ?? "" })}
              placeholder="— 无音效 —"
            />
          </div>
        )}

        {line.type === "scene_ref" && (
          <input
            ref={primaryRef}
            className="input"
            value={line.cardName}
            onChange={(e) => onChange({ ...line, cardName: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="场景卡名（按名字匹配项目中的卡）"
            style={{ flex: 1, fontSize: 12 }}
          />
        )}

        {line.type === "actor_ref" && (
          <input
            ref={primaryRef}
            className="input"
            value={line.cardName}
            onChange={(e) => onChange({ ...line, cardName: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="角色卡名（按名字匹配项目中的卡）"
            style={{ flex: 1, fontSize: 12 }}
          />
        )}

        {line.type === "jump" && (
          <select
            ref={selectRef}
            className="select"
            value={line.target}
            onChange={(e) => onChange({ ...line, target: e.target.value })}
            onKeyDown={handleKeyDown}
            style={{ flex: 1, fontSize: 12 }}
          >
            <option value="">— 选择目标 —</option>
            <option value="END">END（结束）</option>
            {knotNames.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
            {line.target &&
            line.target !== "END" &&
            !knotNames.includes(line.target) ? (
              <option value={line.target}>{line.target}（未找到）</option>
            ) : null}
          </select>
        )}

        {line.type === "choice" && (
          <input
            ref={primaryRef}
            className="input"
            value={line.label}
            onChange={(e) => onChange({ ...line, label: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="选项文本"
            style={{ flex: 1, fontSize: 12 }}
          />
        )}

        {line.type === "gather" && (
          <AutoGrowTextarea
            value={line.text}
            onChange={(v) => onChange({ ...line, text: v })}
            onEnter={onEnter}
            autoFocus={autoFocus}
            placeholder="汇合标记（可空，选项在此汇合）"
            style={{ fontSize: 12 }}
          />
        )}

        {line.type === "condition" && (
          <>
            <input
              ref={primaryRef}
              className="input"
              value={line.expr}
              onChange={(e) => onChange({ ...line, expr: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="表达式，如 gold >= 5"
              style={{
                width: 160,
                flexShrink: 0,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
              }}
            />
            <AutoGrowTextarea
              value={line.text}
              onChange={(v) => onChange({ ...line, text: v })}
              onEnter={onEnter}
              placeholder="满足时显示的文本"
              style={{ flex: 1, fontSize: 12 }}
            />
          </>
        )}

        {line.type === "assign" && (
          <>
            {varNames.length > 0 ? (
              <select
                ref={selectRef}
                className="select"
                value={line.key}
                onChange={(e) => onChange({ ...line, key: e.target.value })}
                onKeyDown={handleKeyDown}
                style={{ width: 110, flexShrink: 0, fontSize: 12 }}
              >
                <option value="">— 变量 —</option>
                {varNames.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : (
              <input
                ref={primaryRef}
                className="input"
                value={line.key}
                onChange={(e) => onChange({ ...line, key: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder="变量名"
                style={{ width: 110, flexShrink: 0, fontSize: 12 }}
              />
            )}
            <select
              className="select"
              value={line.op}
              onChange={(e) =>
                onChange({ ...line, op: e.target.value as "=" | "+=" | "-=" })
              }
              style={{ width: 64, flexShrink: 0, fontSize: 12 }}
            >
              <option value="=">=</option>
              <option value="+=">+=</option>
              <option value="-=">-=</option>
            </select>
            <input
              className="input"
              value={line.value}
              onChange={(e) => onChange({ ...line, value: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="值（数字 / 字符串 / true）"
              style={{ flex: 1, fontSize: 12 }}
            />
          </>
        )}

        {line.type === "glue" && (
          <div
            style={{
              flex: 1,
              fontSize: 12,
              color: "var(--fg-muted)",
              padding: "4px 0",
            }}
          >
            下一行文本与本行拼接显示
          </div>
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
