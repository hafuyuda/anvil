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
  const relationKinds = useProjectStore((s) => s.relationKinds);
  const upsertRelation = useProjectStore((s) => s.upsertRelation);

  const availableKinds: RelationKind[] = scenario.edge_kinds.length
    ? relationKinds.filter((k) => scenario.edge_kinds.includes(k.id))
    : relationKinds;

  const [kind, setKind] = useState(relation.kind);
  const [label, setLabel] = useState(relation.label ?? "");
  const [condition, setCondition] = useState(
    typeof relation.meta?.condition === "string" ? relation.meta.condition : "",
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function update<T>(setter: (v: T) => void, v: T) {
    setter(v);
    setDirty(true);
  }

  async function save() {
    const updated: Relation = {
      ...relation,
      kind,
      label: label.trim() ? label : null,
      meta: { ...relation.meta, condition },
    };
    await ipc.upsertRelation(updated);
    upsertRelation(updated);
    setDirty(false);
    onClose();
  }

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
          <button onClick={onClose}>取消</button>
          <button onClick={save} disabled={!dirty}>
            保存
          </button>
        </>
      }
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 420,
            background: "#fff",
            borderRadius: 8,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>编辑关系</div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "#888" }}>关系类型</span>
            <select
              value={kind}
              onChange={(e) => update(setKind, e.target.value)}
              style={{ padding: "4px 6px" }}
            >
              {availableKinds.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "#888" }}>备注（可选）</span>
            <input
              value={label}
              onChange={(e) => update(setLabel, e.target.value)}
              placeholder="例如：如果玩家帮过布洛克"
              style={{ padding: "4px 6px" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "#888" }}>条件表达式</span>
            <textarea
              value={condition}
              onChange={(e) => update(setCondition, e.target.value)}
              placeholder="例如：visited_anvil == true"
              style={{
                padding: "4px 6px",
                minHeight: 60,
                fontFamily: "monospace",
                fontSize: 12,
              }}
            />
            <span style={{ fontSize: 11, color: "#aaa" }}>
              留空表示无条件。可用变量：
              {scenario.variables.length === 0
                ? "（尚未定义）"
                : scenario.variables.map((v) => v.key).join(", ")}
            </span>
          </label>
          {scenario.variables.length > 0 && (
            <div
              style={{
                borderTop: "1px solid #eee",
                paddingTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 11, color: "#888" }}>试算</div>
              {scenario.variables.map((v) => {
                const val = testValues[v.key];
                return (
                  <div
                    key={v.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "100px 1fr",
                      gap: 6,
                      alignItems: "center",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "#666" }}>{v.key}</span>
                    {v.ty.kind === "bool" ? (
                      <input
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={(e) =>
                          setTestValues((s) => ({
                            ...s,
                            [v.key]: e.target.checked,
                          }))
                        }
                      />
                    ) : v.ty.kind === "number" ? (
                      <input
                        type="number"
                        value={
                          val === undefined || val === null ? "" : String(val)
                        }
                        onChange={(e) =>
                          setTestValues((s) => ({
                            ...s,
                            [v.key]:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          }))
                        }
                        style={{ padding: "3px 6px" }}
                      />
                    ) : (
                      <input
                        value={(val as string) ?? ""}
                        onChange={(e) =>
                          setTestValues((s) => ({
                            ...s,
                            [v.key]: e.target.value,
                          }))
                        }
                        style={{ padding: "3px 6px" }}
                      />
                    )}
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={validateNow} style={{ fontSize: 12 }}>
                  校验语法
                </button>
                <button onClick={runTest} style={{ fontSize: 12 }}>
                  试算
                </button>
                {testResult && (
                  <span
                    style={{
                      fontSize: 12,
                      color: testResult.ok ? "#286" : "#c33",
                    }}
                  >
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={onClose}>取消</button>
            <button onClick={save} disabled={!dirty}>
              保存
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
