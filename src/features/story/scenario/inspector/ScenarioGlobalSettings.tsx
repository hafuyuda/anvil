import type { Scenario } from "../../../../core/ipc";
import { SectionLabel } from "../../../../components/ui/SectionLabel";

interface Props {
  draft: Scenario;
  update: (patch: Partial<Scenario>) => void;
}

export function ScenarioGlobalSettings({ draft, update }: Props) {
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
        <SectionLabel variant="block">入口 knot</SectionLabel>
        <input
          className="input"
          value={draft.entry_knot ?? ""}
          onChange={(e) => update({ entry_knot: e.target.value || null })}
          placeholder="留空则从第一个文件的第一个 knot 开始"
          style={{ fontSize: 12 }}
        />
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            marginTop: 4,
          }}
        >
          需与剧本中的 === knot 名一致
        </div>
      </div>

      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          lineHeight: 1.6,
        }}
      >
        变量由剧本中的 VAR 行声明，无需在此维护。
      </div>
    </div>
  );
}
