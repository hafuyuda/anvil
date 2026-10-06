import type { Card, Scenario } from "../../../core/ipc";
import { VariableRow } from "./VariableRow";

interface Props {
  scenario: Scenario;
  values: Record<string, unknown>;
  onChangeValue: (key: string, value: unknown) => void;
  onResetVars: () => void;
  history: string[];
  cards: Card[];
}

export function VariablePanel({
  scenario,
  values,
  onChangeValue,
  onResetVars,
  history,
  cards,
}: Props) {
  return (
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
            onChange={(val) => onChangeValue(v.key, val)}
          />
        ))}
        {scenario.variables.length > 0 && (
          <button
            className="btn"
            onClick={onResetVars}
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
  );
}
