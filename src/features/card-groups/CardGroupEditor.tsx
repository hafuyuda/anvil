import { useMemo, useState } from "react";
import { ipc, type Card, type CardGroup, type CardType } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useDraft } from "../../hooks/useDraft";
import { nowMs } from "../../lib/time";

interface Props {
  group: CardGroup;
}

export function CardGroupEditor({ group }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const upsertCardGroup = useProjectStore((s) => s.upsertCardGroup);

  const { draft, dirty, update, commit } = useDraft(
    group,
    async (d): Promise<void> => {
      const next: CardGroup = { ...d, updated_at: nowMs() };
      await ipc.upsertCardGroup(next);
      upsertCardGroup(next);
    },
    {
      undoLabel: "编辑卡组",
      onDraftChange: (d) => {
        upsertCardGroup({ ...d, updated_at: nowMs() });
      },
    },
  );

  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);

  const typeById = useMemo(() => {
    const m = new Map<string, CardType>();
    for (const t of cardTypes) m.set(t.id, t);
    return m;
  }, [cardTypes]);

  function removeCard(id: string) {
    update({ card_ids: draft.card_ids.filter((x) => x !== id) });
  }

  function moveCard(id: string, direction: -1 | 1) {
    const idx = draft.card_ids.indexOf(id);
    if (idx < 0) return;
    const next = [...draft.card_ids];
    const target = idx + direction;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    update({ card_ids: next });
  }

  function togglePick(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function confirmPick() {
    const existing = new Set(draft.card_ids);
    const toAdd = Array.from(picked).filter((id) => !existing.has(id));
    if (toAdd.length === 0) {
      setPicking(false);
      setPicked(new Set());
      setPickQuery("");
      return;
    }
    update({ card_ids: [...draft.card_ids, ...toAdd] });
    setPicking(false);
    setPicked(new Set());
    setPickQuery("");
  }

  function cancelPick() {
    setPicking(false);
    setPicked(new Set());
    setPickQuery("");
  }

  // 候选卡：排除已在卡组内的
  const candidateCards = useMemo(() => {
    const inGroup = new Set(draft.card_ids);
    const q = pickQuery.trim().toLowerCase();
    return cards
      .filter((c) => !inGroup.has(c.id))
      .filter((c) => {
        if (!q) return true;
        if (c.name.toLowerCase().includes(q)) return true;
        const t = typeById.get(c.type_id);
        if (t && t.name.toLowerCase().includes(q)) return true;
        return false;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cards, draft.card_ids, pickQuery, typeById]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        padding: 16,
        gap: 12,
        overflow: "auto",
      }}
    >
      {/* 名称 */}
      <div>
        <Label>名称</Label>
        <input
          className="input"
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          style={{
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "var(--font-title)",
          }}
        />
      </div>

      {/* 描述 */}
      <div>
        <Label>描述</Label>
        <textarea
          className="textarea"
          value={draft.description ?? ""}
          onChange={(e) => update({ description: e.target.value || null })}
          style={{ minHeight: 60 }}
        />
      </div>

      {/* 卡列表 */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Label style={{ marginBottom: 0 }}>
            卡牌（{draft.card_ids.length}）
          </Label>
          {!picking && (
            <button
              className="btn"
              onClick={() => setPicking(true)}
              style={{ fontSize: 11 }}
            >
              + 添加卡牌
            </button>
          )}
        </div>

        {!picking && draft.card_ids.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--fg-muted)",
              fontSize: 12,
              border: "1px dashed var(--border-default)",
              borderRadius: "var(--radius-md)",
            }}
          >
            还没有卡牌。点「+ 添加卡牌」开始。
          </div>
        )}

        {!picking && draft.card_ids.length > 0 && (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              overflow: "hidden",
            }}
          >
            {draft.card_ids.map((id, i) => {
              const card = cardById.get(id);
              const type = card ? typeById.get(card.type_id) : null;
              return (
                <li
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderBottom:
                      i < draft.card_ids.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      color: "var(--fg-muted)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      minWidth: 24,
                      textAlign: "right",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      color: card ? "var(--fg-primary)" : "var(--fg-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={card?.name ?? id}
                  >
                    {card?.name ?? `（已删除 ${id.slice(0, 8)}）`}
                  </span>
                  {type && (
                    <span
                      style={{
                        color: "var(--fg-muted)",
                        fontSize: 11,
                        flexShrink: 0,
                      }}
                    >
                      {type.name}
                    </span>
                  )}
                  <button
                    className="btn btn-ghost"
                    onClick={() => moveCard(id, -1)}
                    disabled={i === 0}
                    title="上移"
                    style={{
                      fontSize: 11,
                      padding: "1px 6px",
                      color: "var(--fg-muted)",
                    }}
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => moveCard(id, 1)}
                    disabled={i === draft.card_ids.length - 1}
                    title="下移"
                    style={{
                      fontSize: 11,
                      padding: "1px 6px",
                      color: "var(--fg-muted)",
                    }}
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => removeCard(id)}
                    title="移除"
                    style={{
                      fontSize: 12,
                      padding: "1px 6px",
                      color: "var(--danger)",
                    }}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* 添加卡片选择区 */}
        {picking && (
          <div
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <input
              className="input"
              autoFocus
              value={pickQuery}
              onChange={(e) => setPickQuery(e.target.value)}
              placeholder="搜索卡牌名或类型…"
            />

            <div
              style={{
                maxHeight: 260,
                overflowY: "auto",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-panel)",
              }}
            >
              {candidateCards.length === 0 && (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    color: "var(--fg-muted)",
                    fontSize: 12,
                  }}
                >
                  {cards.length === 0 ? "项目里还没有卡牌" : "没有可添加的卡牌"}
                </div>
              )}
              {candidateCards.map((c) => {
                const t = typeById.get(c.type_id);
                const checked = picked.has(c.id);
                return (
                  <label
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                      background: checked ? "var(--bg-raised)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePick(c.id)}
                      style={{ accentColor: "var(--accent-gold)" }}
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
                      {c.name}
                    </span>
                    {t && (
                      <span
                        style={{
                          color: "var(--fg-muted)",
                          fontSize: 11,
                          flexShrink: 0,
                        }}
                      >
                        {t.name}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn"
                onClick={cancelPick}
                style={{ fontSize: 12 }}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmPick}
                disabled={picked.size === 0}
                style={{ fontSize: 12 }}
              >
                添加 {picked.size > 0 ? `(${picked.size})` : ""}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 保存 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginTop: "auto",
          paddingTop: 8,
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: dirty ? "var(--warning)" : "var(--fg-muted)",
          }}
        >
          {dirty ? "保存中…" : "已保存"}
        </span>
        <button
          className="btn"
          onClick={commit}
          disabled={!dirty}
          style={{ fontSize: 12 }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "var(--fg-muted)",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 4,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
