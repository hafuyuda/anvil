import { useState } from "react";
import {
  ipc,
  type Relation,
  type Scenario,
  type VariableDef,
  type FieldType,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useDraft } from "../../hooks/useDraft";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";
import { StoryGraphView } from "./StoryGraphView";
import { PlayView } from "./PlayView";
import { ScriptPanel } from "./script/ScriptPanel";

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
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const upsertScenario = useProjectStore((s) => s.upsertScenario);
  const upsertRelation = useProjectStore((s) => s.upsertRelation);

  const { draft, dirty, update, commit } = useDraft(
    scenario,
    async (d): Promise<void | boolean> => {
      if (!d.name.trim()) return false;
      const keys = d.variables.map((v) => v.key);
      const dup = keys.find((k, i) => keys.indexOf(k) !== i);
      if (dup) return false;
      const next: Scenario = { ...d, updated_at: nowMs() };
      await ipc.upsertScenario(next);
      upsertScenario(next);
    },
    {
      undoLabel: "编辑剧情",
      onDraftChange: (d) => {
        upsertScenario({ ...d, updated_at: nowMs() });
      },
    },
  );

  const [tab, setTab] = useState<"settings" | "graph" | "script" | "play">(
    "settings",
  );

  function addVariable() {
    const v: VariableDef = {
      key: `var_${nowMs().toString(36)}`,
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
      alert("节点之间没有可导入的世界观关系。");
      return;
    }
    if (
      !confirm(
        `导入 ${candidates.length} 条世界观关系到本剧情？\n\n` +
          `原关系保留不动，会复制一份到本剧情。\n` +
          `复制后的关系只能在剧情图里看到和编辑。`,
      )
    ) {
      return;
    }

    for (const r of candidates) {
      const copied: Relation = {
        ...r,
        id: newId(),
        meta: {
          ...r.meta,
          scenario_id: scenario.id,
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
        flex: 1,
        minHeight: 0,
        background: "var(--bg-app)",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "6px 12px",
          flexShrink: 0,
          background: "var(--bg-panel)",
          display: "flex",
          gap: 4,
        }}
      >
        <TabButton
          active={tab === "settings"}
          onClick={() => setTab("settings")}
        >
          设置
        </TabButton>
        <TabButton active={tab === "graph"} onClick={() => setTab("graph")}>
          节点图
        </TabButton>
        <TabButton active={tab === "script"} onClick={() => setTab("script")}>
          剧本
        </TabButton>
        <TabButton active={tab === "play"} onClick={() => setTab("play")}>
          运行
        </TabButton>
      </div>

      {tab === "settings" && (
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
                          edge_kinds: draft.edge_kinds.filter(
                            (x) => x !== k.id,
                          ),
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
            <div
              style={{
                fontSize: 11,
                color: "var(--fg-muted)",
                marginBottom: 6,
                padding: "6px 8px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
              }}
            >
              建议：剧情图的节点用「场景」类型卡，而不是角色或地点。
              场景卡的字段包括时间、地点、参与者、描述和对白，运行视图会显示这些信息。
            </div>
            <div
              style={{
                maxHeight: 220,
                overflow: "auto",
                border: "1px solid var(--border-subtle)",
                padding: 6,
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
              }}
            >
              {cards.length === 0 && (
                <div
                  style={{ fontSize: 12, color: "var(--fg-muted)", padding: 4 }}
                >
                  还没有卡牌
                </div>
              )}
              {cards.map((c) => {
                const cardType = cardTypes.find((t) => t.id === c.type_id);
                const isScene = cardType?.name === "场景";
                return (
                  <label
                    key={c.id}
                    style={{
                      display: "flex",
                      gap: 6,
                      fontSize: 12,
                      color: "var(--fg-secondary)",
                      cursor: "pointer",
                      padding: "2px 0",
                      opacity: isScene ? 1 : 0.65,
                    }}
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
                      style={{ accentColor: "var(--accent-gold)" }}
                    />
                    <span
                      style={{
                        color: isScene ? "var(--fg-primary)" : undefined,
                      }}
                    >
                      {c.name}
                    </span>
                    <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>
                      {cardType?.name ?? "?"}
                    </span>
                  </label>
                );
              })}
            </div>
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

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                变量
              </div>
              <button
                className="btn"
                onClick={addVariable}
                style={{ fontSize: 11, padding: "2px 8px" }}
              >
                + 变量
              </button>
            </div>
            {draft.variables.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>无</div>
            )}
            {draft.variables.map((v, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 100px 1fr auto",
                  gap: 6,
                  alignItems: "center",
                  padding: "4px 0",
                  fontSize: 12,
                }}
              >
                <input
                  className="input"
                  value={v.label}
                  onChange={(e) => updateVariable(i, { label: e.target.value })}
                  placeholder="显示名"
                />
                <input
                  className="input"
                  value={v.key}
                  onChange={(e) => updateVariable(i, { key: e.target.value })}
                  placeholder="key"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
                <select
                  className="select"
                  value={v.ty.kind}
                  onChange={(e) =>
                    updateVariable(i, {
                      ty: defaultVarType(e.target.value as FieldType["kind"]),
                    })
                  }
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
                <button
                  className="btn btn-ghost"
                  onClick={() => removeVariable(i)}
                  style={{
                    color: "var(--danger)",
                    padding: "1px 6px",
                    fontSize: 12,
                  }}
                  title="删除变量"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

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
      )}

      {tab === "graph" && (
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <StoryGraphView scenario={scenario} />
        </div>
      )}

      {tab === "script" && (
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <ScriptPanel scenario={scenario} />
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-ghost"
      onClick={onClick}
      style={{
        fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        borderBottom: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
        padding: "4px 12px",
      }}
    >
      {children}
    </button>
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

function DefaultValueInput({
  ty,
  value,
  onChange,
}: {
  ty: FieldType;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (ty.kind === "bool") {
    return (
      <label
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
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          style={{ accentColor: "var(--accent-gold)" }}
        />
        默认
      </label>
    );
  }

  if (ty.kind === "number") {
    return (
      <input
        className="input"
        type="number"
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        placeholder="默认值"
      />
    );
  }

  return (
    <input
      className="input"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="默认值"
    />
  );
}
