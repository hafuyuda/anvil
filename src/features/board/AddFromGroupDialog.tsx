import { useMemo, useState } from "react";
import type { CardGroup } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { Modal } from "../../components/Modal";
import { SectionLabel } from "../../components/SectionLabel";
import { EmptyState } from "../../components/EmptyState";

interface Props {
  onClose: () => void;
  onImport: (group: CardGroup, shuffleOn: boolean) => void;
}

export function AddFromGroupDialog({ onClose, onImport }: Props) {
  const cardGroups = useProjectStore((s) => s.cardGroups) ?? [];
  const cards = useProjectStore((s) => s.cards) ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shuffleOn, setShuffleOn] = useState(false);

  const cardIdSet = useMemo(() => {
    const m = new Set<string>();
    for (const c of cards) m.add(c.id);
    return m;
  }, [cards]);

  // 卡组里「实际存在」的卡数量
  const validCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of cardGroups) {
      m.set(g.id, g.card_ids.filter((id) => cardIdSet.has(id)).length);
    }
    return m;
  }, [cardGroups, cardIdSet]);

  const selected = selectedId
    ? (cardGroups.find((g) => g.id === selectedId) ?? null)
    : null;
  const selectedValidCount = selected ? (validCounts.get(selected.id) ?? 0) : 0;

  function handleImport() {
    if (!selected) return;
    onImport(selected, shuffleOn);
  }

  return (
    <Modal
      title="从卡组导入"
      width={440}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!selected || selectedValidCount === 0}
          >
            导入
            {selectedValidCount > 0 ? `（${selectedValidCount}）` : ""}
          </button>
        </>
      }
    >
      {cardGroups.length === 0 && (
        <EmptyState>还没有卡组。去「卡组」模块创建一个。</EmptyState>
      )}

      {cardGroups.length > 0 && (
        <>
          <SectionLabel variant="field" style={{ marginBottom: 6 }}>
            选择卡组
          </SectionLabel>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            {cardGroups.map((g, i) => {
              const validCount = validCounts.get(g.id) ?? 0;
              const total = g.card_ids.length;
              const missing = total - validCount;
              const active = selectedId === g.id;
              return (
                <li
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    borderBottom:
                      i < cardGroups.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                    background: active ? "var(--bg-raised)" : "transparent",
                    borderLeft: active
                      ? "3px solid var(--accent-gold)"
                      : "3px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    opacity: validCount === 0 ? 0.55 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--fg-primary)",
                        fontWeight: active ? 600 : 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {g.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--fg-muted)",
                        marginTop: 2,
                      }}
                    >
                      {total} 张
                      {missing > 0 && (
                        <>
                          {" · "}
                          <span style={{ color: "var(--warning)" }}>
                            {missing} 张已失效
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color:
                        validCount > 0
                          ? "var(--accent-gold)"
                          : "var(--fg-muted)",
                      fontFamily: "var(--font-mono)",
                      flexShrink: 0,
                    }}
                  >
                    {validCount > 0 ? `×${validCount}` : "空"}
                  </span>
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: 12 }}>
            <SectionLabel variant="field" style={{ marginBottom: 6 }}>
              铺开顺序
            </SectionLabel>
            
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="btn"
                onClick={() => setShuffleOn(false)}
                style={{
                  flex: 1,
                  background: !shuffleOn ? "var(--bg-raised)" : "transparent",
                  borderColor: !shuffleOn
                    ? "var(--accent-gold)"
                    : "var(--border-default)",
                  fontWeight: !shuffleOn ? 600 : 400,
                }}
              >
                原序
              </button>
              <button
                className="btn"
                onClick={() => setShuffleOn(true)}
                style={{
                  flex: 1,
                  background: shuffleOn ? "var(--bg-raised)" : "transparent",
                  borderColor: shuffleOn
                    ? "var(--accent-gold)"
                    : "var(--border-default)",
                  fontWeight: shuffleOn ? 600 : 400,
                }}
              >
                随机
              </button>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--fg-muted)",
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              按网格铺开，从棋盘左上角开始，每行 8 张。
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
