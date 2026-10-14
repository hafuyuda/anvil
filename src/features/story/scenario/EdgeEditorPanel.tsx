import { useMemo } from "react";
import {
  ipc,
  type Relation,
  type RelationKind,
  type Scenario,
} from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { useDraft } from "../../../hooks/useDraft";
import { useDeleteUndo } from "../../../hooks/useDeleteUndo";
import { confirmDialog } from "../../../lib/confirm";
import { runWithError } from "../../../lib/runWithError";
import { SectionLabel } from "../../../components/ui/SectionLabel";
import { LabeledBlock } from "../../../components/ui/LabeledBlock";

interface Props {
  relation: Relation;
  scenario: Scenario | null;
}

export function EdgeEditorPanel({ relation, scenario }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const upsertRelation = useProjectStore((s) => s.upsertRelation);
  const removeRelation = useProjectStore((s) => s.removeRelation);
  const selectEdge = useProjectStore((s) => s.selectEdge);

  const { draft, dirty, update, commit } = useDraft(
    relation,
    async (d): Promise<void | boolean> => {
      await ipc.upsertRelation(d);
      upsertRelation(d);
    },
    {
      undoLabel: "编辑关系",
      onDraftChange: (d) => {
        upsertRelation(d);
      },
    },
  );

  const availableKinds: RelationKind[] = useMemo(() => {
    if (scenario && scenario.edge_kinds.length > 0) {
      return relationKinds.filter((k) => scenario.edge_kinds.includes(k.id));
    }
    return relationKinds;
  }, [relationKinds, scenario]);

  const sourceCard = cards.find((c) => c.id === draft.from);
  const targetCard = cards.find((c) => c.id === draft.to);

  const currentKind = relationKinds.find((k) => k.id === draft.kind);

  const deleteWithUndo = useDeleteUndo();

  async function handleDelete() {
    if (
      !(await confirmDialog({
        message: "删除这条关系？可用 Ctrl+Z 撤销。",
        confirmLabel: "删除",
        danger: true,
      }))
    )
      return;
    const snapshot = { ...draft };
    await runWithError(
      () =>
        deleteWithUndo({
          label: "删除剧情关系",
          do: async () => {
            await ipc.deleteRelation(snapshot.from, snapshot.id);
            removeRelation(snapshot.id);
            selectEdge(null);
          },
          restore: async () => {
            await ipc.upsertRelation(snapshot);
            upsertRelation(snapshot);
          },
        }),
      "删除失败",
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 源 → 目标 */}
      <div
        style={{
          padding: 8,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          fontSize: 12,
        }}
      >
        <SectionLabel>从 → 到</SectionLabel>

        <div style={{ color: "var(--fg-primary)" }}>
          <span
            style={{ cursor: "pointer", color: "var(--accent-gold)" }}
            onClick={() =>
              sourceCard && useProjectStore.getState().selectCard(sourceCard.id)
            }
          >
            {sourceCard?.name ?? draft.from.slice(0, 8)}
          </span>
          <span style={{ color: "var(--fg-muted)", margin: "0 6px" }}>→</span>
          <span
            style={{ cursor: "pointer", color: "var(--accent-gold)" }}
            onClick={() =>
              targetCard && useProjectStore.getState().selectCard(targetCard.id)
            }
          >
            {targetCard?.name ?? draft.to.slice(0, 8)}
          </span>
        </div>
        {currentKind?.inverse_name && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "var(--fg-muted)",
              fontStyle: "italic",
            }}
          >
            （在 {targetCard?.name ?? "目标"} 的视角：{currentKind.inverse_name}
            ）
          </div>
        )}
      </div>

      <LabeledBlock label="关系类型">
        <select
          className="select"
          value={draft.kind}
          onChange={(e) => update({ kind: e.target.value })}
        >
          {availableKinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </LabeledBlock>

      <LabeledBlock label="备注（可选）">
        <input
          className="input"
          value={draft.label ?? ""}
          onChange={(e) => update({ label: e.target.value || null })}
          placeholder="例如：去酒馆打听"
        />
      </LabeledBlock>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
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
          style={{ fontSize: 11 }}
        >
          保存
        </button>
        <button
          className="btn btn-danger"
          onClick={handleDelete}
          style={{ marginLeft: "auto" }}
        >
          删除
        </button>
      </div>

      <details style={{ fontSize: 11, color: "var(--fg-muted)" }}>
        <summary>原始数据</summary>
        <pre
          style={{
            overflow: "auto",
            maxHeight: 200,
            fontFamily: "var(--font-mono)",
          }}
        >
          {JSON.stringify(draft, null, 2)}
        </pre>
      </details>
    </div>
  );
}
