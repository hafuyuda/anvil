import type { Scenario } from "../../../../core/ipc";
import { SectionLabel } from "../../../../components/ui/SectionLabel";

interface Props {
  draft: Scenario;
  update: (patch: Partial<Scenario>) => void;
  /** 剧本全部 knot 名（入口 knot 下拉用） */
  knotNames: string[];
  /** 剧本变量（VAR 解析，只读） */
  vars: { key: string; literal: string }[];
}

export function ScenarioGlobalSettings({ draft, update, knotNames, vars }: Props) {
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
        <select
          className="select"
          value={draft.entry_knot ?? ""}
          onChange={(e) => update({ entry_knot: e.target.value || null })}
          style={{ fontSize: 12 }}
        >
          <option value="">默认（第一个 knot）</option>
          {knotNames.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
          {draft.entry_knot &&
          !knotNames.includes(draft.entry_knot) ? (
            <option value={draft.entry_knot}>
              {draft.entry_knot}（未找到）
            </option>
          ) : null}
        </select>
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            marginTop: 4,
          }}
        >
          来自剧本中的 === knot 行
        </div>
      </div>

      <div>
        <SectionLabel variant="block">
          变量（只读）
          <span style={{ color: "var(--fg-muted)", marginLeft: 4 }}>
            {vars.length}
          </span>
        </SectionLabel>
        {vars.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            剧本中还没有 VAR 行
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-secondary)",
            }}
          >
            {vars.map((v) => (
              <div key={v.key}>
                <span style={{ color: "var(--fg-muted)" }}>VAR </span>
                {v.key} = {v.literal}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
