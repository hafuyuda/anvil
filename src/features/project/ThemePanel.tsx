import { useEffect, useState } from "react";
import { ipc, type Theme } from "../../core/ipc/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { applyTheme, resetTheme } from "../../lib/theme";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";

const PRESET_VARIABLES: { key: string; label: string }[] = [
  { key: "--bg-app", label: "应用背景" },
  { key: "--bg-panel", label: "面板背景" },
  { key: "--bg-surface", label: "表面背景" },
  { key: "--bg-raised", label: "悬停背景" },
  { key: "--fg-primary", label: "主文字" },
  { key: "--fg-secondary", label: "次要文字" },
  { key: "--fg-muted", label: "弱化文字" },
  { key: "--accent-gold", label: "金色强调" },
  { key: "--accent-copper", label: "铜色强调" },
  { key: "--accent-ember", label: "暗红强调" },
  { key: "--border-subtle", label: "细边框" },
  { key: "--border-default", label: "默认边框" },
  { key: "--danger", label: "危险" },
  { key: "--success", label: "成功" },
];

function readCurrentVariables(): Record<string, string> {
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const { key } of PRESET_VARIABLES) {
    const v = cs.getPropertyValue(key).trim();
    if (v) out[key] = v;
  }
  return out;
}

interface Props {
  manifestThemeId: string | null;
  onChangeThemeId: (id: string | null) => void;
}

export function ThemePanel({ manifestThemeId, onChangeThemeId }: Props) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Theme | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    ipc
      .listThemes()
      .then(setThemes)
      .catch(() => setThemes([]));
  }, []);

  const selected = themes.find((t) => t.id === selectedId) ?? null;

  function newTheme() {
    const t: Theme = {
      id: newId(),
      name: "新主题",
      description: null,
      variables: readCurrentVariables(),
      created_at: nowMs(),
      updated_at: nowMs(),
    };
    setDraft(t);
    setSelectedId(null);
    setDirty(true);
  }

  function selectTheme(t: Theme) {
    setSelectedId(t.id);
    setDraft({ ...t });
    setDirty(false);
    applyTheme(t.variables);
  }

  function updateVar(key: string, value: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      variables: { ...draft.variables, [key]: value },
      updated_at: nowMs(),
    });
    setDirty(true);
    applyTheme({ [key]: value });
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      alert("主题名不能为空");
      return;
    }
    try {
      await ipc.upsertTheme(draft);
      const list = await ipc.listThemes();
      setThemes(list);
      setSelectedId(draft.id);
      setDirty(false);
    } catch (e) {
      alert("保存失败: " + e);
    }
  }

  async function remove(id: string) {
    if (!confirm("删除这个主题？")) return;
    try {
      await ipc.deleteTheme(id);
      const list = await ipc.listThemes();
      setThemes(list);
      if (selectedId === id) {
        setSelectedId(null);
        setDraft(null);
        resetTheme();
      }
      if (manifestThemeId === id) {
        onChangeThemeId(null);
      }
    } catch (e) {
      alert("删除失败: " + e);
    }
  }

  function applyAsProjectTheme(id: string | null) {
    onChangeThemeId(id);
    if (id) {
      const t = themes.find((x) => x.id === id);
      if (t) applyTheme(t.variables);
    } else {
      resetTheme();
    }
  }

  function reset() {
    resetTheme();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <button className="btn btn-primary" onClick={newTheme}>
          + 从当前配色新建
        </button>
        <button className="btn" onClick={reset}>
          重置为默认
        </button>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--fg-muted)",
        }}
      >
        当前项目主题：
        <select
          className="select"
          value={manifestThemeId ?? ""}
          onChange={(e) => applyAsProjectTheme(e.target.value || null)}
          style={{ marginLeft: 8, width: 200 }}
        >
          <option value="">默认（Anvil Dark）</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ minWidth: 160 }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            主题列表（{themes.length}）
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {themes.map((t) => (
              <li
                key={t.id}
                onClick={() => selectTheme(t)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "4px 8px",
                  cursor: "pointer",
                  borderRadius: "var(--radius-sm)",
                  background:
                    selectedId === t.id ? "var(--bg-raised)" : "transparent",
                  borderLeft:
                    selectedId === t.id
                      ? "2px solid var(--accent-gold)"
                      : "2px solid transparent",
                }}
              >
                <span style={{ flex: 1, fontSize: 12 }}>{t.name}</span>
                <button
                  className="btn btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(t.id);
                  }}
                  style={{
                    color: "var(--danger)",
                    padding: "0 6px",
                    fontSize: 12,
                  }}
                  title="删除"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>

        {draft && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                style={{ flex: 1, fontWeight: 600 }}
              />
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={!dirty}
              >
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
                    style={{ display: "flex", flexDirection: "column", gap: 2 }}
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
                        onChange={(e) => updateVar(key, e.target.value)}
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
                        onChange={(e) => updateVar(key, e.target.value)}
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
        )}
      </div>
    </div>
  );
}
