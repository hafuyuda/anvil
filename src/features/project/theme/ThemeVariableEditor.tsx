import type { Theme } from "../../../core/ipc";
import { PRESET_VARIABLES } from "./themeConstants";

interface Props {
  draft: Theme;
  setDraft: (t: Theme) => void;
  dirty: boolean;
  onSave: () => void;
  onUpdateVar: (key: string, value: string) => void;
}

export function ThemeVariableEditor({
  draft,
  setDraft,
  dirty,
  onSave,
  onUpdateVar,
}: Props) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          className="input"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          style={{ flex: 1, fontWeight: 600 }}
        />
        <button className="btn btn-primary" onClick={onSave} disabled={!dirty}>
          {dirty ? "保存" : "已保存"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        {PRESET_VARIABLES.map(({ key, label }) => {
          const value = draft.variables[key] ?? "";
          return (
            <label
              key={key}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                {label}
                <span
                  style={{
                    marginLeft: 4,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                  }}
                >
                  {key}
                </span>
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  className="input"
                  value={value}
                  onChange={(e) => onUpdateVar(key, e.target.value)}
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                />
                <input
                  type="color"
                  value={
                    value.startsWith("#") && value.length >= 7
                      ? value.slice(0, 7)
                      : "#000000"
                  }
                  onChange={(e) => onUpdateVar(key, e.target.value)}
                  style={{
                    width: 32,
                    padding: 0,
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface)",
                    cursor: "pointer",
                  }}
                />
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
