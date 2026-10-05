import { useEffect, useMemo, useState } from "react";
import {
  ipc,
  type Card,
  type Scenario,
  type VariableDef,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { applyEffects, parseEffects } from "./effects";

interface Props {
  scenario: Scenario;
}

export function PlayView({ scenario }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];

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

  const outgoing = useMemo(
    () =>
      relations.filter(
        (r) =>
          r.from === currentId &&
          nodeIds.has(r.to) &&
          r.meta?.scenario_id === scenario.id,
      ),
    [relations, currentId, nodeIds, scenario.id],
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const states: Record<string, { ok: boolean; error?: string }> = {};
      const allEdges = relations.filter(
        (r) =>
          nodeIds.has(r.from) &&
          nodeIds.has(r.to) &&
          r.meta?.scenario_id === scenario.id,
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

  function advance(relationId: string, toId: string) {
    if (!currentId) return;

    // 执行效果
    const relation = relations.find((r) => r.id === relationId);
    if (relation) {
      const effects = parseEffects(relation.meta?.effects);
      if (effects.length > 0) {
        const result = applyEffects(values, effects, scenario.variables);
        setValues(result.values);
        if (result.errors.length > 0) {
          console.warn("效果执行警告:", result.errors);
        }
      }
    }

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
    const init: Record<string, unknown> = {};
    for (const v of scenario.variables) {
      init[v.key] = v.default ?? null;
    }
    setValues(init);
  }

  function resetVars() {
    const init: Record<string, unknown> = {};
    for (const v of scenario.variables) {
      init[v.key] = v.default ?? null;
    }
    setValues(init);
  }

  const currentCard: Card | null = currentId
    ? (cards.find((c) => c.id === currentId) ?? null)
    : null;

  const sceneTime = (currentCard?.values?.time as string) ?? null;
  const sceneMood = (currentCard?.values?.mood as string) ?? null;
  const sceneLocationId = (currentCard?.values?.location as string) ?? null;
  const sceneLocation = sceneLocationId
    ? (cards.find((c) => c.id === sceneLocationId) ?? null)
    : null;

  const participantIds: string[] = useMemo(() => {
    const raw = currentCard?.values?.participants;
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === "string" && raw) return [raw];
    return [];
  }, [currentCard]);

  const participants = participantIds
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean) as Card[];

  const sceneDescription = (currentCard?.values?.description as string) ?? "";
  const sceneDialogue = (currentCard?.values?.dialogue as string) ?? "";

  if (!currentId || !currentCard) {
    return (
      <div
        style={{
          padding: 24,
          color: "var(--fg-muted)",
          fontSize: 13,
        }}
      >
        该剧情没有入口节点。去「设置」里指定。
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      {/* 左：变量面板 + 历史 */}
      <div
        style={{
          width: 240,
          borderRight: "1px solid var(--border-subtle)",
          padding: 12,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "var(--bg-panel)",
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            变量
          </div>
          {scenario.variables.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>无</div>
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
            <button
              className="btn"
              onClick={resetVars}
              style={{ fontSize: 11, marginTop: 6 }}
            >
              重置变量
            </button>
          )}
        </div>

        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            历史（{history.length}）
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: 12,
            }}
          >
            {history.map((id, i) => {
              const c = cards.find((x) => x.id === id);
              return (
                <li
                  key={i}
                  style={{
                    color: "var(--fg-secondary)",
                    padding: "2px 0",
                  }}
                >
                  {c?.name ?? id.slice(0, 8)}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* 右：场景 + 分支 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: 16,
          overflow: "auto",
        }}
      >
        <div
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-panel)",
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            当前场景
          </div>
          <div
            style={{
              fontSize: 20,
              fontFamily: "var(--font-title)",
              fontWeight: 600,
              color: "var(--accent-gold)",
              marginBottom: 8,
            }}
          >
            {currentCard.name}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              fontSize: 12,
              color: "var(--fg-secondary)",
              marginBottom: 10,
            }}
          >
            {sceneLocation && (
              <span>
                <span style={{ color: "var(--fg-muted)" }}>地点</span>{" "}
                {sceneLocation.name}
              </span>
            )}
            {sceneTime && (
              <span>
                <span style={{ color: "var(--fg-muted)" }}>时间</span>{" "}
                {sceneTime}
              </span>
            )}
            {sceneMood && (
              <span>
                <span style={{ color: "var(--fg-muted)" }}>氛围</span>{" "}
                {sceneMood}
              </span>
            )}
          </div>

          {participants.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 12,
              }}
            >
              {participants.map((p) => (
                <span
                  key={p.id}
                  style={{
                    padding: "2px 8px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 11,
                    color: "var(--fg-primary)",
                  }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}

          {sceneDescription && (
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--fg-primary)",
                marginBottom: 12,
                whiteSpace: "pre-wrap",
              }}
            >
              {sceneDescription}
            </div>
          )}

          {sceneDialogue && (
            <details style={{ fontSize: 12 }}>
              <summary
                style={{
                  color: "var(--fg-muted)",
                  cursor: "pointer",
                  marginBottom: 6,
                }}
              >
                对白
              </summary>
              <div
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.7,
                  color: "var(--fg-primary)",
                }}
              >
                {sceneDialogue}
              </div>
            </details>
          )}
        </div>

        <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={back}
            disabled={history.length === 0}
          >
            回退
          </button>
          <button className="btn" onClick={reset}>
            重置
          </button>
        </div>

        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            可走的分支（{outgoing.length}）
          </div>
          {outgoing.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              没有出边
            </div>
          )}
          {outgoing.map((r) => {
            const state = edgeStates[r.id];
            const kind = relationKinds.find((k) => k.id === r.kind);
            const reachable = state?.ok ?? false;
            const err = state?.error;
            const target = cards.find((c) => c.id === r.to);
            const label = r.label || kind?.name || "继续";

            const effects = parseEffects(r.meta?.effects);
            const effectsText = effects.map((e) => e.raw).join(" · ");

            return (
              <div
                key={r.id}
                onClick={() => reachable && advance(r.id, r.to)}
                style={{
                  padding: "10px 12px",
                  marginBottom: 6,
                  borderRadius: "var(--radius-md)",
                  background: reachable
                    ? "var(--bg-surface)"
                    : "var(--bg-panel)",
                  border: reachable
                    ? "1px solid var(--border-default)"
                    : "1px solid var(--border-subtle)",
                  opacity: reachable ? 1 : 0.5,
                  cursor: reachable ? "pointer" : "not-allowed",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: reachable
                        ? "var(--fg-primary)"
                        : "var(--fg-secondary)",
                      fontWeight: 600,
                      flex: 1,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--fg-secondary)",
                    }}
                  >
                    {target?.name ?? r.to.slice(0, 8)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: reachable ? "var(--success)" : "var(--danger)",
                      minWidth: 48,
                      textAlign: "right",
                    }}
                  >
                    {err ? "错误" : reachable ? "可达" : "不可达"}
                  </span>
                </div>

                {effectsText && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: "var(--fg-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    效果：{effectsText}
                  </div>
                )}
              </div>
            );
          })}
          {outgoing.some((r) => edgeStates[r.id]?.error) && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "var(--danger)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {outgoing
                .filter((r) => edgeStates[r.id]?.error)
                .map((r) => (
                  <div key={r.id}>
                    {r.label ?? r.id.slice(0, 8)}: {edgeStates[r.id].error}
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
    <div
      style={{
        fontSize: 11,
        color: "var(--fg-secondary)",
        marginBottom: 3,
      }}
    >
      {def.label}
    </div>
  );

  if (def.ty.kind === "bool") {
    return (
      <div style={{ marginBottom: 6 }}>
        {label}
        <label
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
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
          {String(Boolean(value))}
        </label>
      </div>
    );
  }

  if (def.ty.kind === "number") {
    return (
      <div style={{ marginBottom: 6 }}>
        {label}
        <input
          className="input"
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 6 }}>
      {label}
      <input
        className="input"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
