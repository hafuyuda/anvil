import { useState } from "react";
import { ipc, type CardGroup } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EntityListLayout } from "../../components/EntityListLayout";
import { CardGroupEditor } from "./CardGroupEditor";
import { useDeleteUndo } from "../../hooks/useDeleteUndo";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";
import { confirmDialog } from "../../lib/confirm";
import { runWithError } from "../../lib/runWithError";

export function CardGroupList() {
  const cardGroups = useProjectStore((s) => s.cardGroups) ?? [];
  const upsertCardGroup = useProjectStore((s) => s.upsertCardGroup);
  const removeCardGroup = useProjectStore((s) => s.removeCardGroup);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function addGroup() {
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
  }

  const deleteWithUndo = useDeleteUndo();

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
    <EntityListLayout
      listLabel="卡组"
      items={cardGroups}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCreate={addGroup}
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
  );
}
