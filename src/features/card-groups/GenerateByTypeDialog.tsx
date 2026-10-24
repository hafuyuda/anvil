import { useMemo, useState } from "react";
import type { Card, CardType } from "../../core/ipc";
import { Modal } from "../../components/ui/Modal";

interface Props {
  cardTypes: CardType[];
  cards: Card[];
  /** 卡组已有内容时显示「追加 / 替换」选项 */
  hasExisting: boolean;
  onConfirm: (typeIds: string[], mode: "replace" | "append") => void;
  onClose: () => void;
}

export function GenerateByTypeDialog({
  cardTypes,
  cards,
  hasExisting,
  onConfirm,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [mode, setMode] = useState<"replace" | "append">("append");

  const countByType = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) m.set(c.type_id, (m.get(c.type_id) ?? 0) + 1);
    return m;
  }, [cards]);

  const matchedCount = useMemo(() => {
    let n = 0;
    for (const id of selected) n += countByType.get(id) ?? 0;
    return n;
  }, [selected, countByType]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const canConfirm = matchedCount > 0;

  return (
    <Modal
      title="按类型填充卡组"
      width={440}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onConfirm(Array.from(selected), mode)}
            disabled={!canConfirm}
          >
            {canConfirm ? `加入 ${matchedCount} 张` : "选择类型"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-muted)",
            lineHeight: 1.6,
          }}
        >
          勾选卡牌类型，把该类型下的所有卡一次性加入卡组。
        </div>

        {/* 类型列表 */}
        <div
          style={{
            maxHeight: 320,
            overflowY: "auto",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
          }}
        >
          {cardTypes.length === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--fg-muted)",
                fontSize: 12,
              }}
            >
              项目里还没有卡牌类型
            </div>
          )}
          {cardTypes.map((t, i) => {
            const n = countByType.get(t.id) ?? 0;
            const disabled = n === 0;
            const checked = selected.has(t.id);
            return (
              <label
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  cursor: disabled ? "not-allowed" : "pointer",
                  fontSize: 13,
                  borderBottom:
                    i < cardTypes.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  background: checked ? "var(--bg-raised)" : "transparent",
                  opacity: disabled ? 0.45 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(t.id)}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--fg-primary)",
                  }}
                >
                  {t.name}
                </span>
                <span
                  style={{
                    color: n > 0 ? "var(--fg-secondary)" : "var(--fg-muted)",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    flexShrink: 0,
                  }}
                >
                  {n} 张
                </span>
              </label>
            );
          })}
        </div>

        {/* 追加 / 替换 */}
        {hasExisting && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: 10,
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-muted)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              方式
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                cursor: "pointer",
                color: "var(--fg-primary)",
              }}
            >
              <input
                type="radio"
                checked={mode === "append"}
                onChange={() => setMode("append")}
              />
              追加到现有内容
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                cursor: "pointer",
                color: "var(--fg-primary)",
              }}
            >
              <input
                type="radio"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              替换现有内容
              {mode === "replace" && (
                <span
                  style={{
                    color: "var(--danger)",
                    fontSize: 11,
                    marginLeft: 4,
                  }}
                >
                  （会清空当前卡组）
                </span>
              )}
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}
