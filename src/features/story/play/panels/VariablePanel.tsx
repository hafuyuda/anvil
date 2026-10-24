import type { VariableDef } from "../../../../core/ipc";
import { VariableRow } from "./VariableRow";

interface Props {
  variables: VariableDef[];
  values: Record<string, unknown>;
  onChangeValue: (key: string, value: unknown) => void;
  onResetVars: () => void;
  /** 经过 knot 名列表（最近在最后） */
  history: string[];
}

export function VariablePanel({
  variables,
  values,
  onChangeValue,
  onResetVars,
  history,
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
        {variables.length === 0 && (
          <div className="muted">无</div>
        )}
        {variables.map((v) => (
          <VariableRow
            key={v.key}
            def={v}
            value={values[v.key]}
            onChange={(val) => onChangeValue(v.key, val)}
          />
        ))}
        {variables.length > 0 && (
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
          {history.map((knot, i) => (
            <li
              key={i}
              style={{
                color: "var(--fg-secondary)",
                padding: "2px 0",
              }}
            >
              {knot || "—"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
