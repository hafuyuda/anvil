import { useState } from "react";
import { ipc, type CardGroup, type CardType } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EntityListLayout } from "../../components/layout/EntityListLayout";
import { Modal } from "../../components/ui/Modal";
import { CardGroupEditor } from "./CardGroupEditor";
import { GenerateByTypeDialog } from "./GenerateByTypeDialog";
import { useDeleteUndo } from "../../hooks/useDeleteUndo";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";
import { confirmDialog } from "../../lib/confirm";
import { runWithError } from "../../lib/runWithError";

export function CardGroupList() {
  const cardGroups = useProjectStore((s) => s.cardGroups) ?? [];
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const upsertCardGroup = useProjectStore((s) => s.upsertCardGroup);
  const removeCardGroup = useProjectStore((s) => s.removeCardGroup);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [newChoiceOpen, setNewChoiceOpen] = useState(false);
  const [newGenOpen, setNewGenOpen] = useState(false);

  const deleteWithUndo = useDeleteUndo();

  async function createBlankGroup() {
    const now = nowMs();
    const g: CardGroup = {
      id: newId(),
      name: "新卡组",
      description: null,
      card_ids: [],
      created_at: now,
      updated_at: now,
    };
    await ipc.upsertCardGroup(g);
    upsertCardGroup(g);
    setSelectedId(g.id);
    setNewChoiceOpen(false);
  }

  async function createGroupByType(
    typeIds: string[],
    _mode: "replace" | "append",
  ) {
    const idSet = new Set(typeIds);
    const matched = cards
      .filter((c) => idSet.has(c.type_id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => c.id);

    if (matched.length === 0) return;

    const now = nowMs();
    const g: CardGroup = {
      id: newId(),
      name: defaultGroupName(typeIds, cardTypes),
      description: null,
      card_ids: matched,
      created_at: now,
      updated_at: now,
    };
    await runWithError(async () => {
      await ipc.upsertCardGroup(g);
      upsertCardGroup(g);
      setSelectedId(g.id);
      setNewGenOpen(false);
    }, "新建卡组失败");
  }

  async function handleDelete(g: CardGroup) {
    if (
      !(await confirmDialog({
        message: `删除卡组「${g.name}」？可用 Ctrl+Z 撤销。`,
        confirmLabel: "删除",
        danger: true,
      }))
    )
      return;
    await runWithError(
      () =>
        deleteWithUndo({
          label: "删除卡组",
          do: async () => {
            await ipc.deleteCardGroup(g.id);
            removeCardGroup(g.id);
            if (selectedId === g.id) setSelectedId(null);
          },
          restore: async () => {
            await ipc.upsertCardGroup(g);
            upsertCardGroup(g);
          },
        }),
      "删除失败",
    );
  }

  return (
    <>
      <EntityListLayout
        listLabel="卡组"
        items={cardGroups}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={() => setNewChoiceOpen(true)}
        onDelete={handleDelete}
        createLabel="+ 新建卡组"
        renderItem={(g) => (
          <span>
            {g.name}
            <span
              style={{
                color: "var(--fg-muted)",
                fontSize: 11,
                marginLeft: 6,
              }}
            >
              {g.card_ids.length}
            </span>
          </span>
        )}
        renderEditor={(g) => <CardGroupEditor key={g.id} group={g} />}
        emptyHint="选择或新建一个卡组"
      />

      {newChoiceOpen && (
        <Modal
          title="新建卡组"
          width={360}
          onClose={() => setNewChoiceOpen(false)}
          footer={
            <button className="btn" onClick={() => setNewChoiceOpen(false)}>
              取消
            </button>
          }
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 13,
              color: "var(--fg-secondary)",
            }}
          >
            <div style={{ lineHeight: 1.6 }}>
              从空白开始，还是按卡牌类型自动生成？
            </div>
            <button
              className="btn"
              onClick={() => void createBlankGroup()}
              style={{ justifyContent: "flex-start", textAlign: "left" }}
            >
              空白卡组
            </button>
            <button
              className="btn"
              onClick={() => {
                setNewChoiceOpen(false);
                setNewGenOpen(true);
              }}
              style={{ justifyContent: "flex-start", textAlign: "left" }}
              disabled={cardTypes.length === 0}
              title={
                cardTypes.length === 0 ? "项目里还没有卡牌类型" : undefined
              }
            >
              按类型生成…
            </button>
          </div>
        </Modal>
      )}

      {newGenOpen && (
        <GenerateByTypeDialog
          cardTypes={cardTypes}
          cards={cards}
          hasExisting={false}
          onConfirm={(typeIds, mode) => void createGroupByType(typeIds, mode)}
          onClose={() => setNewGenOpen(false)}
        />
      )}
    </>
  );
}

function defaultGroupName(typeIds: string[], cardTypes: CardType[]): string {
  const names = typeIds
    .map((id) => cardTypes.find((t) => t.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return "新卡组";
  if (names.length <= 2) return names.join(" · ");
  return `${names[0]} 等 ${names.length} 类`;
}
