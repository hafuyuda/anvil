import { useEffect, useMemo, useState } from "react";
import { ipc, type Scenario, type VariableDef } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";

interface Props {
  scenario: Scenario;
}

export function PlayView({ scenario }: Props) {
  const cards = useProjectStore((s) => s.cards);
  const relations = useProjectStore((s) => s.relations);
  const relationKinds = useProjectStore((s) => s.relationKinds);

  // 初始化变量值
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const v of scenario.variables) {
      init[v.key] = v.default ?? null;
    }
    return init;
  });

  const [currentId, setCurrentId] = useState<string | null>(
    scenario.entry_node ?? scenario.node_ids[0] ?? null,
  );
  const [history, setHistory] = useState<string[]>([]);
  const [edgeStates, setEdgeStates] = useState<
    Record<string, { ok: boolean; error?: string }>
  >({});

  const nodeIds = useMemo(
    () => new Set(scenario.node_ids),
    [scenario.node_ids],
  );

  // 当前节点相关的出边
  const outgoing = useMemo(
    () => relations.filter((r) => r.from === currentId && nodeIds.has(r.to)),
    [relations, currentId, nodeIds],
  );

  // 每次变量或当前节点变化，重新求值所有边
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const states: Record<string, { ok: boolean; error?: string }> = {};
      const allEdges = relations.filter(
        (r) => nodeIds.has(r.from) && nodeIds.has(r.to),
      );
      for (const r of allEdges) {
        const expr =
          typeof r.meta?.condition === "string" ? r.meta.condition : "";
        if (!expr.trim()) {
          states[r.id] = { ok: true };
          continue;
        }
        try {
          const ok = await ipc.evalCondition(scenario, expr, values);
          states[r.id] = { ok };
        } catch (e) {
          states[r.id] = { ok: false, error: String(e) };
        }
      }
      if (!cancelled) setEdgeStates(states);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [relations, nodeIds, values, scenario]);

  function advance(toId: string) {
    if (!currentId) return;
    setHistory((h) => [...h, currentId]);
    setCurrentId(toId);
  }

  function back() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setCurrentId(prev);
      return h.slice(0, -1);
    });
  }

  function reset() {
    setHistory([]);
    setCurrentId(scenario.entry_node ?? scenario.node_ids[0] ?? null);
  }

  function resetVars() {
    const init: Record<string, unknown> = {};
    for (const v of scenario.variables) {
      init[v.key] = v.default ?? null;
    }
    setValues(init);
  }

  const cardName = (id: string) =>
    cards.find((c) => c.id === id)?.name ?? id.slice(0, 8);

  if (!currentId) {
    return (
      <div style={{ padding: 24, color: "#888" }}>
        该剧情没有入口节点。去「设置」里指定。
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        gap: 16,
      }}
    >
      {/* 左：变量面板 + 历史 */}
      <div
        style={{
          width: 240,
          borderRight: "1px solid #eee",
          padding: 12,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#888",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            变量
          </div>
          {scenario.variables.length === 0 && (
            <div style={{ fontSize: 12, color: "#aaa" }}>无</div>
          )}
          {scenario.variables.map((v) => (
            <VariableRow
              key={v.key}
              def={v}
              value={values[v.key]}
              onChange={(val) => setValues((s) => ({ ...s, [v.key]: val }))}
            />
          ))}
          {scenario.variables.length > 0 && (
            <button onClick={resetVars} style={{ fontSize: 12, marginTop: 6 }}>
              重置变量
            </button>
          )}
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              color: "#888",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            历史（{history.length}）
          </div>
          <ul
            style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12 }}
          >
            {history.map((id, i) => (
              <li key={i} style={{ color: "#666", padding: "2px 0" }}>
                {cardName(id)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 右：当前节点 + 可达边 */}
      <div style={{ flex: 1, minWidth: 0, padding: 16, overflow: "auto" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
            当前节点
          </div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {cardName(currentId)}
          </div>
        </div>

        <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
          <button onClick={back} disabled={history.length === 0}>
            回退
          </button>
          <button onClick={reset}>重置</button>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              color: "#888",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            可走的分支（{outgoing.length}）
          </div>
          {outgoing.length === 0 && (
            <div style={{ fontSize: 12, color: "#aaa" }}>没有出边</div>
          )}
          {outgoing.map((r) => {
            const state = edgeStates[r.id];
            const kind = relationKinds.find((k) => k.id === r.kind);
            const reachable = state?.ok ?? false;
            const err = state?.error;
            return (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  marginBottom: 4,
                  borderRadius: 4,
                  background: reachable ? "#eef8ee" : "#f6f6f6",
                  opacity: reachable ? 1 : 0.5,
                  cursor: reachable ? "pointer" : "not-allowed",
                }}
                onClick={() => reachable && advance(r.to)}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: kind?.color ?? "#666",
                    minWidth: 60,
                  }}
                >
                  {kind?.name ?? r.kind}
                </span>
                <span style={{ flex: 1 }}>{cardName(r.to)}</span>
                <span
                  style={{
                    fontSize: 11,
                    color: reachable ? "#286" : "#c33",
                  }}
                >
                  {err ? "错误" : reachable ? "可达" : "不可达"}
                </span>
              </div>
            );
          })}
          {outgoing.some((r) => edgeStates[r.id]?.error) && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#c33",
                fontFamily: "monospace",
              }}
            >
              {outgoing
                .filter((r) => edgeStates[r.id]?.error)
                .map((r) => (
                  <div key={r.id}>
                    {cardName(r.to)}: {edgeStates[r.id].error}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VariableRow({
  def,
  value,
  onChange,
}: {
  def: VariableDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = (
    <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>
      {def.label}
    </div>
  );

  const style = {
    width: "100%",
    padding: "3px 6px",
    fontSize: 12,
    boxSizing: "border-box" as const,
  };

  if (def.ty.kind === "bool") {
    return (
      <div style={{ marginBottom: 6 }}>
        {label}
        <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span style={{ fontSize: 12 }}>{String(Boolean(value))}</span>
        </label>
      </div>
    );
  }

  if (def.ty.kind === "number") {
    return (
      <div style={{ marginBottom: 6 }}>
        {label}
        <input
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          style={style}
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 6 }}>
      {label}
      <input
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={style}
      />
    </div>
  );
}
