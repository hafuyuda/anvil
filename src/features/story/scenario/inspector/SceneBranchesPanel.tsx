import { useMemo, useState } from "react";
import {
  ipc,
  type Card,
  type Relation,
  type RelationKind,
  type Scenario,
} from "../../../../core/ipc";
import { useProjectStore } from "../../../../stores/projectStore";
import { newId } from "../../../../lib/id";
import { nowMs } from "../../../../lib/time";
import { SectionLabel } from "../../../../components/SectionLabel";
import { toast } from "../../../../lib/toast";
import { runWithError } from "../../../../lib/runWithError";

interface Props {
  scenario: Scenario;
  sceneId: string;
}

export function SceneBranchesPanel({ scenario, sceneId }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const selectEdge = useProjectStore((s) => s.selectEdge);

  const [adding, setAdding] = useState(false);

  const scene = cards.find((c) => c.id === sceneId);

  const outgoing = useMemo(
    () =>
      relations.filter(
        (r) => r.from === sceneId && r.meta?.scenario_id === scenario.id,
      ),
    [relations, sceneId, scenario.id],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <SectionLabel variant="block">当前场景</SectionLabel>
        <div style={{ fontSize: 13, color: "var(--fg-primary)" }}>
          {scene?.name ?? sceneId.slice(0, 8)}
        </div>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <SectionLabel variant="block" style={{ marginBottom: 0 }}>
            分支（{outgoing.length}）
          </SectionLabel>
          {!adding && (
            <button
              className="btn btn-ghost"
              onClick={() => setAdding(true)}
              style={{ fontSize: 11, padding: "2px 8px" }}
            >
              + 添加
            </button>
          )}
        </div>

        {outgoing.length === 0 && !adding && (
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
            没有出边。剧本在此结束。
          </div>
        )}

        {outgoing.map((r) => (
          <BranchRow
            key={r.id}
            relation={r}
            cards={cards}
            onEdit={() => selectEdge(r.id)}
          />
        ))}

        {adding && (
          <NewBranchForm
            scenario={scenario}
            sceneId={sceneId}
            onDone={() => setAdding(false)}
          />
        )}
      </div>
    </div>
  );
}

function BranchRow({
  relation,
  cards,
  onEdit,
}: {
  relation: Relation;
  cards: Card[];
  onEdit: () => void;
}) {
  const target = cards.find((c) => c.id === relation.to);
  const label = relation.label || "";
  const condition =
    typeof relation.meta?.condition === "string" ? relation.meta.condition : "";
  const effects = Array.isArray(relation.meta?.effects)
    ? (relation.meta.effects as unknown[]).map(String)
    : [];

  return (
    <div
      onClick={onEdit}
      style={{
        padding: "8px 10px",
        marginBottom: 6,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--fg-primary)",
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label || target?.name || relation.to.slice(0, 8)}
        </span>
        <span style={{ color: "var(--fg-muted)", fontSize: 11, flexShrink: 0 }}>
          → {target?.name ?? relation.to.slice(0, 8)}
        </span>
      </div>
      {condition && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "var(--fg-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          条件：{condition}
        </div>
      )}
      {effects.length > 0 && (
        <div
          style={{
            marginTop: 2,
            fontSize: 11,
            color: "var(--fg-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          效果：{effects.join(" · ")}
        </div>
      )}
    </div>
  );
}

function NewBranchForm({
  scenario,
  sceneId,
  onDone,
}: {
  scenario: Scenario;
  sceneId: string;
  onDone: () => void;
}) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const upsertRelation = useProjectStore((s) => s.upsertRelation);

  const targetOptions = scenario.node_ids
    .map((id) => cards.find((c) => c.id === id))
    .filter((c): c is Card => Boolean(c) && c!.id !== sceneId);

  const kindOptions = relationKinds.filter(
    (k) =>
      scenario.edge_kinds.length === 0 || scenario.edge_kinds.includes(k.id),
  );

  const [targetId, setTargetId] = useState("");
  const [kindId, setKindId] = useState(kindOptions[0]?.id ?? "");

  async function handleCreate() {
    if (!targetId || !kindId) {
      toast.info("请选择目标和关系类型");
      return;
    }
    const rel: Relation = {
      id: newId(),
      from: sceneId,
      to: targetId,
      kind: kindId,
      label: null,
      meta: {
        scenario_id: scenario.id,
        condition: "",
        effects: [],
      },
      created_at: nowMs(),
    };
    const r = await runWithError(async () => {
      await ipc.upsertRelation(rel);
      upsertRelation(rel);
    }, "添加分支失败");
    if (r.ok) onDone();
  }

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <label
        style={{
          fontSize: 12,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <span style={{ color: "var(--fg-muted)" }}>目标场景</span>
        <select
          className="select"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">— 选择 —</option>
          {targetOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label
        style={{
          fontSize: 12,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <span style={{ color: "var(--fg-muted)" }}>关系类型</span>
        <select
          className="select"
          value={kindId}
          onChange={(e) => setKindId(e.target.value)}
        >
          {kindOptions.map((k: RelationKind) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button className="btn" onClick={onDone} style={{ fontSize: 11 }}>
          取消
        </button>
        <button
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={!targetId || !kindId}
          style={{ fontSize: 11 }}
        >
          创建
        </button>
      </div>
    </div>
  );
}
