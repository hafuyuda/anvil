import { useMemo, useState } from "react";
import { ipc, type Card, type CardGroup, type CardType } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useDraft } from "../../hooks/useDraft";
import { nowMs } from "../../lib/time";
import { CardGroupCardList } from "./CardGroupCardList";
import { CardGroupPicker } from "./CardGroupPicker";

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
    if (toAdd.length > 0) {
      update({ card_ids: [...draft.card_ids, ...toAdd] });
    }
    setPicking(false);
    setPicked(new Set());
    setPickQuery("");
  }

  function cancelPick() {
    setPicking(false);
    setPicked(new Set());
    setPickQuery("");
  }

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

        {!picking && (
          <CardGroupCardList
            cardIds={draft.card_ids}
            cardById={cardById}
            typeById={typeById}
            onMove={moveCard}
            onRemove={removeCard}
          />
        )}

        {picking && (
          <CardGroupPicker
            pickQuery={pickQuery}
            setPickQuery={setPickQuery}
            candidateCards={candidateCards}
            typeById={typeById}
            picked={picked}
            totalCards={cards.length}
            onToggle={togglePick}
            onCancel={cancelPick}
            onConfirm={confirmPick}
          />
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
