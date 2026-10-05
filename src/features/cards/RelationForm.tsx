import { useMemo, useState } from "react";
import { ipc, type Relation, type RelationKind } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { FieldInput } from "../../components/FieldInput";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";

interface Props {
  fromCardId: string;
  fromTypeId: string;
  onDone: () => void;
}

export function RelationForm({ fromCardId, fromTypeId, onDone }: Props) {
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const cards = useProjectStore((s) => s.cards) ?? [];
  const upsertRelation = useProjectStore((s) => s.upsertRelation);

  const availableKinds = useMemo(
    () =>
      relationKinds.filter(
        (k) =>
          k.from_types.length === 0 || k.from_types.includes(fromTypeId)
      ),
    [relationKinds, fromTypeId]
  );

  const [kindId, setKindId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [meta, setMeta] = useState<Record<string, unknown>>({});

  const kind: RelationKind | null =
    availableKinds.find((k) => k.id === kindId) ?? null;

  const targetCards = useMemo(() => {
    if (!kind) return [];
    return cards.filter(
      (c) =>
        c.id !== fromCardId &&
        (kind.to_types.length === 0 || kind.to_types.includes(c.type_id))
    );
  }, [cards, kind, fromCardId]);

  async function handleSave() {
    if (!kind) {
      alert("请选择关系类型");
      return;
    }
    if (!toId) {
      alert("请选择目标卡牌");
      return;
    }
    const relation: Relation = {
      id: newId(),
      from: fromCardId,
      to: toId,
      kind: kind.id,
      label: null,
      meta,
      created_at: nowMs(),
    };
    try {
      await ipc.upsertRelation(relation);
      upsertRelation(relation);
      onDone();
    } catch (e) {
      alert("保存失败: " + e);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
        border: "1px dashed var(--border-strong)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        marginBottom: 8,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          关系类型
        </div>
        <select
          className="select"
          value={kindId}
          onChange={(e) => {
            setKindId(e.target.value);
            setToId("");
            setMeta({});
          }}
        >
          <option value="">— 选择 —</option>
          {availableKinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </div>

      {kind && (
        <>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--fg-muted)",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              目标卡牌
            </div>
            <select
              className="select"
              value={toId}
              onChange={(e) => setToId(e.target.value)}
            >
              <option value="">— 选择 —</option>
              {targetCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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
        </>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" onClick={handleSave}>
          保存关系
        </button>
        <button className="btn" onClick={onDone}>
          取消
        </button>
      </div>
    </div>
  );
}