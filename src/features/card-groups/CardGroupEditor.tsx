import { useMemo, useState } from "react";
import { ipc, type Card, type CardGroup, type CardType } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useDraft } from "../../hooks/useDraft";
import { nowMs } from "../../lib/time";
import { toast } from "../../lib/toast";
import { CardGroupCards } from "./CardGroupCards";
import { CardGroupPicker } from "./CardGroupPicker";
import { GenerateByTypeDialog } from "./GenerateByTypeDialog";
import { getCardGroupView, listCardGroupViews } from "./views/registry";
import { removeOne } from "./aggregate";

const GROUP_VIEWS = listCardGroupViews();

interface Props {
  group: CardGroup;
}

export function CardGroupEditor({ group }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const upsertCardGroup = useProjectStore((s) => s.upsertCardGroup);
  const view = useProjectStore((s) => s.cardGroupView);
  const setView = useProjectStore((s) => s.setCardGroupView);

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
  const [picked, setPicked] = useState<Map<string, number>>(new Map());
  const [genOpen, setGenOpen] = useState(false);

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
    update({ card_ids: removeOne(draft.card_ids, id) });
  }

  function reorderCards(next: string[]) {
    update({ card_ids: next });
  }

  function setPickCount(id: string, n: number) {
    setPicked((m) => {
      const next = new Map(m);
      if (n <= 0) next.delete(id);
      else next.set(id, n);
      return next;
    });
  }

  function confirmPick() {
    const additions: string[] = [];
    for (const [id, count] of picked) {
      for (let i = 0; i < count; i++) additions.push(id);
    }
    if (additions.length > 0) {
      update({ card_ids: [...draft.card_ids, ...additions] });
    }
    setPicking(false);
    setPicked(new Map());
    setPickQuery("");
  }

  function cancelPick() {
    setPicking(false);
    setPicked(new Map());
    setPickQuery("");
  }

  function handleGenerate(typeIds: string[], mode: "replace" | "append") {
    const idSet = new Set(typeIds);
    const matched = cards
      .filter((c) => idSet.has(c.type_id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => c.id);

    if (matched.length === 0) {
      toast.info("所选类型下没有卡牌");
      return;
    }

    const next = mode === "replace" ? matched : [...draft.card_ids, ...matched];
    update({ card_ids: next });
    setGenOpen(false);
    toast.success(
      `${mode === "replace" ? "已替换为" : "已加入"} ${matched.length} 张卡`,
    );
  }

  const candidateCards = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    return cards
      .filter((c) => {
        if (!q) return true;
        if (c.name.toLowerCase().includes(q)) return true;
        const t = typeById.get(c.type_id);
        if (t && t.name.toLowerCase().includes(q)) return true;
        return false;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cards, pickQuery, typeById]);

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
            gap: 8,
          }}
        >
          <Label style={{ marginBottom: 0 }}>
            卡牌（{draft.card_ids.length}）
          </Label>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 2 }}>
              {GROUP_VIEWS.map((v) => {
                const active = getCardGroupView(view).id === v.id;
                return (
                  <button
                    key={v.id}
                    className="btn btn-icon"
                    onClick={() => setView(v.id)}
                    title={v.label}
                    style={{
                      fontSize: 12,
                      background: active ? "var(--bg-raised)" : "transparent",
                      borderColor: active
                        ? "var(--accent-gold)"
                        : "var(--border-default)",
                    }}
                  >
                    {v.icon}
                  </button>
                );
              })}
            </div>

            {!picking && (
              <>
                <button
                  className="btn"
                  onClick={() => setPicking(true)}
                  style={{ fontSize: 11 }}
                >
                  + 添加卡牌
                </button>
                <button
                  className="btn"
                  onClick={() => setGenOpen(true)}
                  style={{ fontSize: 11 }}
                  title="按卡牌类型一次性加入多张卡"
                >
                  按类型填充
                </button>
              </>
            )}
          </div>
        </div>

        {!picking && (
          <CardGroupCards
            cardIds={draft.card_ids}
            cardById={cardById}
            typeById={typeById}
            view={view}
            onReorder={reorderCards}
            onRemoveOne={removeCard}
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
            onSetCount={setPickCount}
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

      {genOpen && (
        <GenerateByTypeDialog
          cardTypes={cardTypes}
          cards={cards}
          hasExisting={draft.card_ids.length > 0}
          onConfirm={handleGenerate}
          onClose={() => setGenOpen(false)}
        />
      )}
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
