import { ipc, type RelationKind } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useDraft } from "../../hooks/useDraft";
import { TypeMultiSelect } from "../../components/TypeMultiSelect";
import { nowMs } from "../../lib/time";

interface Props {
  relationKind: RelationKind;
}

export function RelationKindEditor({ relationKind }: Props) {
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const upsertRelationKind = useProjectStore((s) => s.upsertRelationKind);

  const { draft, dirty, update, commit } = useDraft(
    relationKind,
    async (d): Promise<void | boolean> => {
      if (!d.name.trim()) {
        return false;
      }
      const next: RelationKind = { ...d, updated_at: nowMs() };
      await ipc.upsertRelationKind(next);
      upsertRelationKind(next);
    },
    { undoLabel: "编辑关系类型" },
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 12,
        overflow: "auto",
        flex: 1,
        minHeight: 0,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="关系名（如：位于）"
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: 14,
            fontWeight: 600,
          }}
        />
        <span style={{ fontSize: 11, color: dirty ? "#c80" : "#888" }}>
          {dirty ? "保存中…" : "已保存"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <label style={{ flex: 1, fontSize: 12 }}>
          <div style={{ color: "#888", marginBottom: 4 }}>
            反向名（如：包含）
          </div>
          <input
            value={draft.inverse_name ?? ""}
            onChange={(e) => update({ inverse_name: e.target.value || null })}
            style={{
              width: "100%",
              padding: "4px 6px",
              boxSizing: "border-box",
            }}
          />
        </label>
        <label style={{ fontSize: 12 }}>
          <div style={{ color: "#888", marginBottom: 4 }}>颜色</div>
          <input
            type="color"
            value={draft.color ?? "#888888"}
            onChange={(e) => update({ color: e.target.value })}
          />
        </label>
        <label
          style={{
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 4,
            paddingBottom: 6,
          }}
        >
          <input
            type="checkbox"
            checked={draft.directed}
            onChange={(e) => update({ directed: e.target.checked })}
          />
          有向
        </label>
      </div>

      <TypeMultiSelect
        label="起点类型"
        allTypes={cardTypes.map((t) => ({ id: t.id, name: t.name }))}
        value={draft.from_types}
        onChange={(v) => update({ from_types: v })}
      />

      <TypeMultiSelect
        label="终点类型"
        allTypes={cardTypes.map((t) => ({ id: t.id, name: t.name }))}
        value={draft.to_types}
        onChange={(v) => update({ to_types: v })}
      />

      <div style={{ fontSize: 11, color: "#aaa" }}>
        提示：留空表示不限制类型。
      </div>

      <details style={{ fontSize: 11, color: "#aaa" }}>
        <summary>原始数据</summary>
        <pre style={{ overflow: "auto", maxHeight: 200 }}>
          {JSON.stringify(draft, null, 2)}
        </pre>
      </details>
    </div>
  );
}
