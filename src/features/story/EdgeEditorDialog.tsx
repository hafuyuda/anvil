import { useEffect, useState } from "react";
import {
  ipc,
  type Relation,
  type RelationKind,
  type Scenario,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { Modal } from "../../components/Modal";

interface Props {
  scenario: Scenario;
  relation: Relation;
  onClose: () => void;
}

export function EdgeEditorDialog({ scenario, relation, onClose }: Props) {
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const upsertRelation = useProjectStore((s) => s.upsertRelation);

  const availableKinds: RelationKind[] = scenario.edge_kinds.length
    ? relationKinds.filter((k) => scenario.edge_kinds.includes(k.id))
    : relationKinds;

  const [kind, setKind] = useState(relation.kind);
  const [label, setLabel] = useState(relation.label ?? "");
  const [condition, setCondition] = useState(
    typeof relation.meta?.condition === "string" ? relation.meta.condition : "",
  );
  const [testValues, setTestValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const v of scenario.variables) {
      init[v.key] = v.default ?? null;
    }
    return init;
  });
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  async function save() {
    const updated: Relation = {
      ...relation,
      kind,
      label: label.trim() ? label : null,
      meta: { ...relation.meta, condition },
    };
    await ipc.upsertRelation(updated);
    upsertRelation(updated);
    onClose();
  }

  async function runTest() {
    try {
      const ok = await ipc.evalCondition(scenario, condition, testValues);
      setTestResult({ ok, message: ok ? "通过" : "不通过" });
    } catch (e) {
      setTestResult({ ok: false, message: "表达式错误: " + e });
    }
  }

  async function validateNow() {
    try {
      await ipc.validateCondition(scenario, condition);
      setTestResult({ ok: true, message: "语法正确" });
    } catch (e) {
      setTestResult({ ok: false, message: "语法错误: " + e });
    }
  }

  return (
    <Modal
      title="编辑关系"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={save}>
            保存
          </button>
        </>
      }
    >
      <LabeledBlock label="关系类型">
        <select
          className="select"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {availableKinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </LabeledBlock>

      <LabeledBlock label="备注（可选）">
        <input
          className="input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="例如：如果玩家帮过布洛克"
        />
      </LabeledBlock>

      <LabeledBlock label="条件表达式">
        <textarea
          className="textarea"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="例如：visited_anvil == true"
          style={{ minHeight: 60, fontFamily: "var(--font-mono)" }}
        />
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            marginTop: 4,
          }}
        >
          留空表示无条件。可用变量：
          {scenario.variables.length === 0
            ? "（尚未定义）"
            : scenario.variables.map((v) => v.key).join(", ")}
        </div>
      </LabeledBlock>

      {scenario.variables.length > 0 && (
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
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
            试算
          </div>
          {scenario.variables.map((v) => (
            <div
              key={v.key}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 8,
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  color: "var(--fg-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {v.key}
              </span>
              {v.ty.kind === "bool" ? (
                <input
                  type="checkbox"
                  checked={Boolean(testValues[v.key])}
                  onChange={(e) =>
                    setTestValues((s) => ({
                      ...s,
                      [v.key]: e.target.checked,
                    }))
                  }
                  style={{ accentColor: "var(--accent-gold)" }}
                />
              ) : v.ty.kind === "number" ? (
                <input
                  className="input"
                  type="number"
                  value={
                    testValues[v.key] === undefined ||
                    testValues[v.key] === null
                      ? ""
                      : String(testValues[v.key])
                  }
                  onChange={(e) =>
                    setTestValues((s) => ({
                      ...s,
                      [v.key]:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              ) : (
                <input
                  className="input"
                  value={(testValues[v.key] as string) ?? ""}
                  onChange={(e) =>
                    setTestValues((s) => ({
                      ...s,
                      [v.key]: e.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn"
              onClick={validateNow}
              style={{ fontSize: 12 }}
            >
              校验语法
            </button>
            <button className="btn" onClick={runTest} style={{ fontSize: 12 }}>
              试算
            </button>
            {testResult && (
              <span
                style={{
                  fontSize: 12,
                  color: testResult.ok ? "var(--success)" : "var(--danger)",
                }}
              >
                {testResult.message}
              </span>
            )}
          </div>
        </div>
      )}
    </Modal>
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
