import { ipc, type Relation, type Scenario } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { newId } from "../../../lib/id";
import { nowMs } from "../../../lib/time";
import { ScenarioNodesEditor } from "./ScenarioNodesEditor";
import { ScenarioVariablesEditor } from "./ScenarioVariablesEditor";
import { toast } from "../../../lib/toast";
import { confirmDialog } from "../../../lib/confirm";

interface Props {
  draft: Scenario;
  update: (patch: Partial<Scenario>) => void;
  dirty: boolean;
  commit: () => void;
}

export function ScenarioSettingsTab({ draft, update, dirty, commit }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const upsertRelation = useProjectStore((s) => s.upsertRelation);

  function countImportable(): number {
    const ids = new Set(draft.node_ids);
    return relations.filter(
      (r) => !r.meta?.scenario_id && ids.has(r.from) && ids.has(r.to),
    ).length;
  }

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
          `原关系保留不动，会复制一份到本剧情。\n` +
          `复制后的关系只能在剧情图里看到和编辑。`,
        confirmLabel: "导入",
      }))
    ) {
      return;
    }
    for (const r of candidates) {
      const copied: Relation = {
        ...r,
        id: newId(),
        meta: {
          ...r.meta,
          scenario_id: draft.id,
          condition: "",
        },
        created_at: nowMs(),
      };
      await ipc.upsertRelation(copied);
      upsertRelation(copied);
    }
  }

  const importableCount = countImportable();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        overflow: "auto",
        flex: 1,
        minHeight: 0,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          className="input"
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          style={{
            flex: 1,
            fontSize: 16,
            fontFamily: "var(--font-title)",
            fontWeight: 600,
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: dirty ? "var(--warning)" : "var(--fg-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {dirty ? "保存中…" : "已保存"}
        </span>
      </div>

      <LabeledBlock label="描述">
        <textarea
          className="textarea"
          value={draft.description ?? ""}
          onChange={(e) => update({ description: e.target.value })}
          style={{ minHeight: 60 }}
        />
      </LabeledBlock>

      <LabeledBlock label="入口节点">
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
      </LabeledBlock>

      <LabeledBlock label="允许的关系类型（留空表示不限制）">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
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
      </LabeledBlock>

      <LabeledBlock label={`节点（${draft.node_ids.length}）`}>
        <ScenarioNodesEditor
          selectedIds={draft.node_ids}
          onChange={(node_ids) => update({ node_ids })}
          cards={cards}
          cardTypes={cardTypes}
        />
      </LabeledBlock>

      <LabeledBlock label="关系">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn"
            onClick={importWorldRelations}
            disabled={importableCount === 0}
            style={{ fontSize: 12 }}
            title={
              importableCount === 0
                ? "节点之间没有世界观关系"
                : `将复制 ${importableCount} 条关系到本剧情`
            }
          >
            从世界观关系导入
            {importableCount > 0 && `（${importableCount}）`}
          </button>
          <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            剧情图只显示打了本剧情标记的关系
          </span>
        </div>
      </LabeledBlock>

      <ScenarioVariablesEditor
        variables={draft.variables}
        onChange={(variables) => update({ variables })}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingTop: 8,
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <button className="btn" onClick={commit} disabled={!dirty}>
          立即保存
        </button>
      </div>
    </div>
  );
}

function LabeledBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
