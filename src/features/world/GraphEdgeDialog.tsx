import { useMemo, useState } from "react";
import {
  ipc,
  type Card,
  type Relation,
  type RelationKind,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { Modal } from "../../components/Modal";
import { FieldInput } from "../../components/FieldInput";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";

interface Props {
  from: Card;
  to: Card;
  onClose: () => void;
}

export function GraphEdgeDialog({ from, to, onClose }: Props) {
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const upsertRelation = useProjectStore((s) => s.upsertRelation);

  const availableKinds: RelationKind[] = useMemo(
    () =>
      relationKinds.filter(
        (k) =>
          (k.from_types.length === 0 || k.from_types.includes(from.type_id)) &&
          (k.to_types.length === 0 || k.to_types.includes(to.type_id)),
      ),
    [relationKinds, from.type_id, to.type_id],
  );

  const [kindId, setKindId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const kind = availableKinds.find((k) => k.id === kindId) ?? null;

  async function handleSave() {
    if (!kind) {
      alert("请选择关系类型");
      return;
    }
    setSaving(true);
    try {
      const relation: Relation = {
        id: newId(),
        from: from.id,
        to: to.id,
        kind: kind.id,
        label: label.trim() ? label.trim() : null,
        meta,
        created_at: nowMs(),
      };
      await ipc.upsertRelation(relation);
      upsertRelation(relation);
      onClose();
    } catch (e) {
      alert("保存失败: " + e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="新建关系"
      width={460}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!kind || saving}
          >
            {saving ? "保存中…" : "创建"}
          </button>
        </>
      }
    >
      {/* 源 → 目标 */}
      <div
        style={{
          padding: 10,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          从 → 到
        </div>
        <div>
          <span style={{ color: "var(--fg-primary)", fontWeight: 600 }}>
            {from.name}
          </span>
          <span style={{ color: "var(--fg-muted)", margin: "0 6px" }}>→</span>
          <span style={{ color: "var(--fg-primary)", fontWeight: 600 }}>
            {to.name}
          </span>
        </div>
      </div>

      {/* 关系类型 */}
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          关系类型
        </span>
        {availableKinds.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--warning)",
              padding: 8,
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            没有可用于这两个类型的关系。
            <br />
            请到「类型 → 关系类型」里调整起点/终点类型限制。
          </div>
        ) : (
          <select
            className="select"
            value={kindId}
            onChange={(e) => {
              setKindId(e.target.value);
              setMeta({});
            }}
          >
            <option value="">— 选择 —</option>
            {availableKinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
                {k.inverse_name ? `（反向：${k.inverse_name}）` : ""}
              </option>
            ))}
          </select>
        )}
      </label>

      {/* 备注 */}
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          备注（可选）
        </span>
        <input
          className="input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="例如：旧识"
        />
      </label>

      {/* meta 字段 */}
      {kind && kind.fields.filter((f) => !f.deprecated).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            附加字段
          </div>
          {kind.fields
            .filter((f) => !f.deprecated)
            .map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={meta[f.key]}
                onChange={(v) => setMeta((m) => ({ ...m, [f.key]: v }))}
              />
            ))}
        </div>
      )}
    </Modal>
  );
}
