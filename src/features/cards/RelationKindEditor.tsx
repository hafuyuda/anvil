import { ipc, type RelationKind } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useDraft } from "../../hooks/useDraft";
import { TypeMultiSelect } from "../../components/TypeMultiSelect";
import { nowMs } from "../../lib/time";
import { useMemo } from "react";

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

  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];

  const conflict = useMemo(() => {
    if (!draft.name.trim()) return null;
    const n = draft.name.trim();
    const inv = (draft.inverse_name ?? "").trim();

    for (const k of relationKinds) {
      if (k.id === draft.id) continue;
      if (k.name === n) {
        return { kind: "same_name" as const, other: k };
      }
      if (inv && k.name === inv && (k.inverse_name ?? "") === n) {
        return { kind: "mutual" as const, other: k };
      }
      if (inv && k.name === inv) {
        return { kind: "reverse_name" as const, other: k };
      }
    }
    return null;
  }, [draft.id, draft.name, draft.inverse_name, relationKinds]);

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
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "var(--fg-muted)",
              lineHeight: 1.5,
            }}
          >
            提示：一个关系类型只需建一次。反向名用于在另一侧的卡牌上显示相反的说法。
            例如「师父」的反向名是「徒弟」，建一条 A → B「师父」，B
            的检查器会自动显示「A → 徒弟」。
          </div>
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

      {conflict && (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            background: "var(--bg-surface)",
            border: "1px solid var(--warning)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
            color: "var(--fg-secondary)",
            lineHeight: 1.6,
          }}
        >
          {conflict.kind === "same_name" && (
            <>
              已存在名为「{conflict.other.name}」的关系类型。
              如果它是同一个关系，建议直接用已有的那个，不要新建。
            </>
          )}
          {conflict.kind === "reverse_name" && (
            <>
              已存在关系类型「{conflict.other.name}」。 你输入的「
              {draft.inverse_name}」可能是它的反向名——
              如果是，建议在那边把反向名补上，而不是新建一个。
            </>
          )}
          {conflict.kind === "mutual" && (
            <>
              已存在关系类型「{conflict.other.name}」（反向名「
              {conflict.other.inverse_name}」）。
              这是同一个关系的反向视角，不需要再建一个。
            </>
          )}
          <div
            style={{
              marginTop: 6,
              padding: "6px 8px",
              background: "var(--bg-app)",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
            }}
          >
            正确用法：只建一个「{draft.name || "关系名"}」， 反向名填「
            {draft.inverse_name || "反向名"}」。 建一条 A → B 的边，B
            的检查器里会自动显示为「
            {draft.inverse_name || "反向名"}」。
          </div>
        </div>
      )}

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
