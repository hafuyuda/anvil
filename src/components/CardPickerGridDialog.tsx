import { useMemo, useState } from "react";
import type { Card, CardType } from "../core/ipc";
import { Modal } from "./Modal";
import { CardGrid, GridCard } from "./CardGrid";

interface Props {
  cards: Card[];
  cardTypes: CardType[];
  onConfirm: (cardIds: string[]) => void;
  onClose: () => void;
  /** 只显示这些类型的卡；空数组或省略则显示全部 */
  filterTypeIds?: string[];
  /** 初始已选 */
  initialSelected?: string[];
  /** 对话框标题 */
  title?: string;
}

export function CardPickerGridDialog({
  cards,
  cardTypes,
  onConfirm,
  onClose,
  filterTypeIds,
  initialSelected,
  title = "选择卡牌",
}: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected ?? []),
  );

  const filtered = useMemo(() => {
    let list = cards;

    if (filterTypeIds && filterTypeIds.length > 0) {
      const allowed = new Set(filterTypeIds);
      list = list.filter((c) => allowed.has(c.type_id));
    }

    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
    if (typeFilter) list = list.filter((c) => c.type_id === typeFilter);
    return list;
  }, [cards, filterTypeIds, query, typeFilter]);

  const typeMap = useMemo(() => {
    const m = new Map<string, CardType>();
    for (const t of cardTypes) m.set(t.id, t);
    return m;
  }, [cardTypes]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (selected.size === 0) return;
    onConfirm([...selected]);
  }

  return (
    <Modal
      title={title}
      width={900}
      onClose={onClose}
      footer={
        <>
          <span
            style={{
              marginRight: "auto",
              fontSize: 12,
              color: "var(--fg-muted)",
            }}
          >
            已选 {selected.size} 张
          </span>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={selected.size === 0}
          >
            加入棋盘
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="搜索卡牌名"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: 140 }}
          >
            <option value="">全部类型</option>
            {cardTypes
              .filter(
                (t) =>
                  !filterTypeIds ||
                  filterTypeIds.length === 0 ||
                  filterTypeIds.includes(t.id),
              )
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>

        <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
          {filtered.length} / {cards.length}
        </div>

        <div
          style={{
            maxHeight: 480,
            overflowY: "auto",
            padding: 4,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--fg-muted)",
                fontSize: 12,
              }}
            >
              没有匹配的卡牌
            </div>
          ) : (
            <CardGrid>
              {filtered.map((c) => {
                const ct = typeMap.get(c.type_id) ?? null;
                const isSelected = selected.has(c.id);
                return (
                  <GridCard
                    key={c.id}
                    card={c}
                    cardType={ct}
                    selected={isSelected}
                    onClick={() => toggle(c.id)}
                    style={{
                      cursor: "pointer",
                      opacity: isSelected ? 1 : 0.85,
                      transition: "opacity 120ms",
                    }}
                    overlay={
                      isSelected ? (
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: "var(--accent-gold)",
                            color: "#1a1612",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          ✓
                        </div>
                      ) : null
                    }
                  />
                );
              })}
            </CardGrid>
          )}
        </div>
      </div>
    </Modal>
  );
}
