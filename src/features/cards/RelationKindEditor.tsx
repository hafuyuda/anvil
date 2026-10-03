import { useState } from "react";
import { ipc, type RelationKind } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";

interface Props {
  relationKind: RelationKind;
}

export function RelationKindEditor({ relationKind }: Props) {
  const cardTypes = useProjectStore((s) => s.cardTypes);
  const upsertRelationKind = useProjectStore((s) => s.upsertRelationKind);
  const [draft, setDraft] = useState<RelationKind>(relationKind);
  const [dirty, setDirty] = useState(false);

  if (draft.id !== relationKind.id) {
    setDraft(relationKind);
    setDirty(false);
  }

  function update(patch: Partial<RelationKind>) {
    setDraft((d) => ({ ...d, ...patch, updated_at: Date.now() }));
    setDirty(true);
  }

  async function save() {
    if (!draft.name.trim()) {
      alert("关系名不能为空");
      return;
    }
    await ipc.upsertRelationKind(draft);
    upsertRelationKind(draft);
    setDirty(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="关系名（如：位于）"
          style={{ flex: 1, padding: "4px 8px", fontSize: 14, fontWeight: 600 }}
        />
        <button onClick={save} disabled={!dirty}>
          {dirty ? "保存" : "已保存"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ flex: 1, fontSize: 12 }}>
          <div style={{ color: "#888", marginBottom: 4 }}>反向名（如：包含）</div>
          <input
            value={draft.inverse_name ?? ""}
            onChange={(e) =>
              update({ inverse_name: e.target.value || null })
            }
            style={{ width: "100%", padding: "4px 6px", boxSizing: "border-box" }}
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
            alignItems: "flex-end",
            gap: 4,
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
    </div>
  );
}

function TypeMultiSelect({
  label,
  allTypes,
  value,
  onChange,
}: {
  label: string;
  allTypes: { id: string; name: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {allTypes.map((t) => (
          <label
            key={t.id}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
          >
            <input
              type="checkbox"
              checked={value.includes(t.id)}
              onChange={(e) => {
                if (e.target.checked) onChange([...value, t.id]);
                else onChange(value.filter((x) => x !== t.id));
              }}
            />
            {t.name}
          </label>
        ))}
      </div>
    </div>
  );
}