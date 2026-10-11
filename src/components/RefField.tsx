import { useMemo, useState } from "react";
import type { Card } from "../core/ipc";
import { useProjectStore } from "../stores/projectStore";
import { CardPickerGridDialog } from "./CardPickerGridDialog";
import { HoverPreview } from "./HoverPreview";

interface Props {
  value: unknown;
  onChange: (ids: string[]) => void;
  targetTypes: string[];
}

/**
 * Ref 字段编辑器。
 * - 已选卡显示为 chips，hover 显示卡牌预览
 * - 点击「选择卡牌」打开可视化选择器
 * - 选择器按 targetTypes 过滤
 */
export function RefField({ value, onChange, targetTypes }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const [pickerOpen, setPickerOpen] = useState(false);

  const ids = useMemo(() => {
    if (Array.isArray(value)) {
      return (value as unknown[]).filter(
        (x): x is string => typeof x === "string" && x.length > 0,
      );
    }
    if (typeof value === "string" && value) return [value];
    return [];
  }, [value]);

  const cardMap = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);

  function remove(id: string) {
    onChange(ids.filter((x) => x !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ids.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {ids.map((id) => {
            const card = cardMap.get(id);
            return (
              <div
                key={id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 4px 2px 8px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 11,
                  maxWidth: "100%",
                }}
              >
                {card ? (
                  <HoverPreview cardId={id}>
                    <span
                      style={{
                        color: "var(--fg-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 160,
                        display: "inline-block",
                        verticalAlign: "bottom",
                      }}
                    >
                      {card.name}
                    </span>
                  </HoverPreview>
                ) : (
                  <span
                    style={{
                      color: "var(--danger)",
                      fontFamily: "var(--font-mono)",
                    }}
                    title="已删除的卡"
                  >
                    {id.slice(0, 8)}…
                  </span>
                )}
                <button
                  onClick={() => remove(id)}
                  title="移除"
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--fg-muted)",
                    fontSize: 13,
                    padding: "0 3px",
                    lineHeight: 1,
                    fontFamily: "inherit",
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        className="btn"
        onClick={() => setPickerOpen(true)}
        style={{ fontSize: 11, alignSelf: "flex-start" }}
      >
        {ids.length === 0 ? "选择卡牌" : "更换卡牌"}
      </button>

      {pickerOpen && (
        <CardPickerGridDialog
          cards={cards}
          cardTypes={cardTypes}
          filterTypeIds={targetTypes}
          initialSelected={ids}
          title="选择引用的卡牌"
          onConfirm={(newIds) => {
            onChange(newIds);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
