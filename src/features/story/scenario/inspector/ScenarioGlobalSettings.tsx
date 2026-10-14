import type { Scenario } from "../../../../core/ipc";
import { useProjectStore } from "../../../../stores/projectStore";
import { SectionLabel } from "../../../../components/ui/SectionLabel";
import { ScenarioNodesEditor } from "../ScenarioNodesEditor";
import { ScenarioVariablesEditor } from "../ScenarioVariablesEditor";

interface Props {
  draft: Scenario;
  update: (patch: Partial<Scenario>) => void;
}

export function ScenarioGlobalSettings({ draft, update }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];

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

      <ScenarioVariablesEditor
        variables={draft.variables}
        onChange={(variables) => update({ variables })}
      />
    </div>
  );
}
