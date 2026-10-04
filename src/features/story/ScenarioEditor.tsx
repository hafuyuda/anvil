import { useState } from "react";
import {
  ipc,
  type Scenario,
  type VariableDef,
  type FieldType,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { StoryGraphView } from "./StoryGraphView";
import { PlayView } from "./PlayView";

interface Props {
  scenario: Scenario;
}

const VAR_KINDS: { kind: FieldType["kind"]; label: string }[] = [
  { kind: "text", label: "文本" },
  { kind: "number", label: "数字" },
  { kind: "bool", label: "布尔" },
];

function defaultVarType(kind: FieldType["kind"]): FieldType {
  return { kind } as FieldType;
}

export function ScenarioEditor({ scenario }: Props) {
  const cards = useProjectStore((s) => s.cards);
  const relationKinds = useProjectStore((s) => s.relationKinds);
  const upsertScenario = useProjectStore((s) => s.upsertScenario);

  const [draft, setDraft] = useState<Scenario>(scenario);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"settings" | "graph" | "play">("settings");

  if (draft.id !== scenario.id) {
    setDraft(scenario);
    setDirty(false);
  }

  function update(patch: Partial<Scenario>) {
    setDraft((d) => ({ ...d, ...patch, updated_at: Date.now() }));
    setDirty(true);
  }

  function addVariable() {
    const v: VariableDef = {
      key: `var_${Date.now().toString(36)}`,
      label: "新变量",
      ty: { kind: "text" },
      default: "",
    };
    update({ variables: [...draft.variables, v] });
  }

  function updateVariable(i: number, patch: Partial<VariableDef>) {
    const variables = draft.variables.map((v, idx) =>
      idx === i ? { ...v, ...patch } : v,
    );
    update({ variables });
  }

  function removeVariable(i: number) {
    update({ variables: draft.variables.filter((_, idx) => idx !== i) });
  }

  async function save() {
    if (!draft.name.trim()) {
      alert("剧情名不能为空");
      return;
    }
    const keys = draft.variables.map((v) => v.key);
    const dup = keys.find((k, i) => keys.indexOf(k) !== i);
    if (dup) {
      alert(`变量 key 重复：${dup}`);
      return;
    }
    await ipc.upsertScenario(draft);
    upsertScenario(draft);
    setDirty(false);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        flex: 1,
        minHeight: 0,
      }}
    >
      <div style={{ borderBottom: "1px solid #eee", paddingBottom: 4 }}>
        <button
          onClick={() => setTab("settings")}
          disabled={tab === "settings"}
          style={{ marginRight: 8 }}
        >
          设置
        </button>
        <button onClick={() => setTab("graph")} disabled={tab === "graph"}>
          节点图
        </button>
        <button onClick={() => setTab("play")} disabled={tab === "play"}>
          运行
        </button>
      </div>

      {tab === "settings" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflow: "auto",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
              style={{
                flex: 1,
                padding: "4px 8px",
                fontSize: 14,
                fontWeight: 600,
              }}
            />
            <button onClick={save} disabled={!dirty}>
              {dirty ? "保存" : "已保存"}
            </button>
          </div>

          <textarea
            value={draft.description ?? ""}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="剧情描述"
            style={{ padding: "4px 8px", fontSize: 12, minHeight: 60 }}
          />

          <div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
              入口节点
            </div>
            <select
              value={draft.entry_node ?? ""}
              onChange={(e) => update({ entry_node: e.target.value || null })}
              style={{ padding: "4px 6px", minWidth: 200 }}
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
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
              允许的关系类型（留空表示不限制）
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {relationKinds.map((k) => (
                <label
                  key={k.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
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
                          edge_kinds: draft.edge_kinds.filter(
                            (x) => x !== k.id,
                          ),
                        });
                    }}
                  />
                  {k.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
              节点（{draft.node_ids.length}）
            </div>
            <div
              style={{
                maxHeight: 200,
                overflow: "auto",
                border: "1px solid #eee",
                padding: 6,
                borderRadius: 4,
              }}
            >
              {cards.map((c) => (
                <label
                  key={c.id}
                  style={{ display: "flex", gap: 4, fontSize: 12 }}
                >
                  <input
                    type="checkbox"
                    checked={draft.node_ids.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked)
                        update({ node_ids: [...draft.node_ids, c.id] });
                      else
                        update({
                          node_ids: draft.node_ids.filter((x) => x !== c.id),
                        });
                    }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 11, color: "#888" }}>变量</div>
              <button onClick={addVariable} style={{ fontSize: 11 }}>
                + 变量
              </button>
            </div>
            {draft.variables.length === 0 && (
              <div style={{ fontSize: 12, color: "#aaa" }}>无</div>
            )}
            {draft.variables.map((v, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 100px auto",
                  gap: 6,
                  alignItems: "center",
                  padding: "4px 0",
                  fontSize: 12,
                }}
              >
                <input
                  value={v.label}
                  onChange={(e) => updateVariable(i, { label: e.target.value })}
                  placeholder="显示名"
                  style={{ padding: "3px 6px" }}
                />
                <input
                  value={v.key}
                  onChange={(e) => updateVariable(i, { key: e.target.value })}
                  placeholder="key"
                  style={{ padding: "3px 6px", fontFamily: "monospace" }}
                />
                <select
                  value={v.ty.kind}
                  onChange={(e) =>
                    updateVariable(i, {
                      ty: defaultVarType(e.target.value as FieldType["kind"]),
                    })
                  }
                  style={{ padding: "3px 6px" }}
                >
                  {VAR_KINDS.map((k) => (
                    <option key={k.kind} value={k.kind}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <DefaultValueInput
                  ty={v.ty}
                  value={v.default}
                  onChange={(value) => updateVariable(i, { default: value })}
                />
                <button onClick={() => removeVariable(i)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "graph" && (
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <StoryGraphView scenario={scenario} />
        </div>
      )}
      {tab === "play" && (
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <PlayView scenario={scenario} />
        </div>
      )}
    </div>
  );
}

function DefaultValueInput({
  ty,
  value,
  onChange,
}: {
  ty: FieldType;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const style = {
    padding: "3px 6px",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  switch (ty.kind) {
    case "bool":
      return (
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          默认
        </label>
      );
    case "number":
      return (
        <input
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          placeholder="默认值"
          style={style}
        />
      );
    default:
      return (
        <input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="默认值"
          style={style}
        />
      );
  }
}
