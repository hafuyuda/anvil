import { ipc, type Relation, type Scenario } from "../../../../core/ipc";
import { useProjectStore } from "../../../../stores/projectStore";
import { newId } from "../../../../lib/id";
import { nowMs } from "../../../../lib/time";
import { SectionLabel } from "../../../../components/SectionLabel";
import { toast } from "../../../../lib/toast";
import { confirmDialog } from "../../../../lib/confirm";
import { ScenarioNodesEditor } from "../ScenarioNodesEditor";
import { ScenarioVariablesEditor } from "../ScenarioVariablesEditor";

interface Props {
  draft: Scenario;
  update: (patch: Partial<Scenario>) => void;
}

export function ScenarioGlobalSettings({ draft, update }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const upsertRelation = useProjectStore((s) => s.upsertRelation);

  const importableCount = (() => {
    const ids = new Set(draft.node_ids);
    return relations.filter(
      (r) => !r.meta?.scenario_id && ids.has(r.from) && ids.has(r.to),
    ).length;
  })();

  async function importWorldRelations() {
    const ids = new Set(draft.node_ids);
    const candidates = relations.filter(
      (r) => !r.meta?.scenario_id && ids.has(r.from) && ids.has(r.to),
    );
    if (candidates.length === 0) {
      toast.info("节点之间没有可导入的世界观关系。");
      return;
    }
    if (
      !(await confirmDialog({
        title: "导入世界观关系",
        message:
          `导入 ${candidates.length} 条世界观关系到本剧情？\n\n` +
          `原关系保留不动，会复制一份到本剧情。`,
        confirmLabel: "导入",
      }))
    ) {
      return;
    }
    for (const r of candidates) {
      const copied: Relation = {
        ...r,
        id: newId(),
        meta: { ...r.meta, scenario_id: draft.id, condition: "" },
        created_at: nowMs(),
      };
      await ipc.upsertRelation(copied);
      upsertRelation(copied);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <SectionLabel variant="block">描述</SectionLabel>
        <textarea
          className="textarea"
          value={draft.description ?? ""}
          onChange={(e) => update({ description: e.target.value })}
          style={{ minHeight: 50 }}
        />
      </div>

      <div>
        <SectionLabel variant="block">入口节点</SectionLabel>
        <select
          className="select"
          value={draft.entry_node ?? ""}
          onChange={(e) => update({ entry_node: e.target.value || null })}
        >
          <option value="">— 未设置 —</option>
          {draft.node_ids.map((id) => {
            const c = cards.find((x) => x.id === id);
            return (
              <option key={id} value={id}>
                {c?.name ?? id.slice(0, 8)}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <SectionLabel variant="block">允许的关系类型</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {relationKinds.length === 0 && (
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              还没有关系类型
            </span>
          )}
          {relationKinds.map((k) => (
            <label
              key={k.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: "var(--fg-secondary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={draft.edge_kinds.includes(k.id)}
                onChange={(e) => {
                  if (e.target.checked)
                    update({ edge_kinds: [...draft.edge_kinds, k.id] });
                  else
                    update({
                      edge_kinds: draft.edge_kinds.filter((x) => x !== k.id),
                    });
                }}
                style={{ accentColor: "var(--accent-gold)" }}
              />
              {k.name}
            </label>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>
          留空表示不限制
        </div>
      </div>

      <div>
        <SectionLabel variant="block">
          节点（{draft.node_ids.length}）
        </SectionLabel>
        <ScenarioNodesEditor
          selectedIds={draft.node_ids}
          onChange={(node_ids) => update({ node_ids })}
          cards={cards}
          cardTypes={cardTypes}
        />
      </div>

      <div>
        <SectionLabel variant="block">关系</SectionLabel>
        <button
          className="btn"
          onClick={importWorldRelations}
          disabled={importableCount === 0}
          style={{ fontSize: 12 }}
        >
          从世界观关系导入
          {importableCount > 0 && `（${importableCount}）`}
        </button>
      </div>

      <ScenarioVariablesEditor
        variables={draft.variables}
        onChange={(variables) => update({ variables })}
      />
    </div>
  );
}
