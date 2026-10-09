import { useEffect, useState } from "react";
import { ipc, type Theme } from "../../core/ipc";
import { applyTheme, resetTheme } from "../../lib/theme";
import { BUILTIN_THEMES, type BuiltinTheme } from "../../themes";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";
import { readCurrentVariables } from "./theme/themeConstants";
import { SectionLabel, ThemeItem } from "./theme/ThemeItem";
import { ThemeVariableEditor } from "./theme/ThemeVariableEditor";
import { toast } from "../../lib/toast";
import { confirmDialog } from "../../lib/confirm";

interface Props {
  manifestThemeId: string | null;
  onChangeThemeId: (id: string | null) => void;
}

type Selection =
  | { type: "builtin"; theme: BuiltinTheme }
  | { type: "project"; theme: Theme }
  | null;

export function ThemePanel({ manifestThemeId, onChangeThemeId }: Props) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [draft, setDraft] = useState<Theme | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    ipc
      .listThemes()
      .then(setThemes)
      .catch(() => setThemes([]));
  }, []);

  function selectBuiltin(t: BuiltinTheme) {
    setSelection({ type: "builtin", theme: t });
    setDraft(null);
    setDirty(false);
    applyTheme(t.variables);
  }

  function selectProjectTheme(t: Theme) {
    setSelection({ type: "project", theme: t });
    setDraft({ ...t });
    setDirty(false);
    applyTheme(t.variables);
  }

  function newThemeFromCurrent() {
    const t: Theme = {
      id: newId(),
      name: "新主题",
      description: null,
      variables: readCurrentVariables(),
      created_at: nowMs(),
      updated_at: nowMs(),
    };
    setSelection({ type: "project", theme: t });
    setDraft(t);
    setDirty(true);
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
      toast.info("主题名不能为空");
      return;
    }
    try {
      await ipc.upsertTheme(draft);
      const list = await ipc.listThemes();
      setThemes(list);
      setSelection({ type: "project", theme: draft });
      setDirty(false);
    } catch (e) {
      toast.error("保存失败: " + e);
    }
  }

  async function remove(id: string) {
    if (
      !(await confirmDialog({
        message: "删除这个主题？",
        confirmLabel: "删除",
        danger: true,
      }))
    )
      return;
    try {
      await ipc.deleteTheme(id);
      const list = await ipc.listThemes();
      setThemes(list);
      if (selection?.type === "project" && selection.theme.id === id) {
        setSelection(null);
        setDraft(null);
        resetTheme();
      }
      if (manifestThemeId === id) {
        onChangeThemeId(null);
      }
    } catch (e) {
      toast.error("删除失败: " + e);
    }
  }

  function applyAsProjectTheme(id: string | null) {
    onChangeThemeId(id);
    if (id) {
      const builtin = BUILTIN_THEMES.find((t) => t.id === id);
      if (builtin) {
        resetTheme();
        applyTheme(builtin.variables);
        return;
      }
      const t = themes.find((x) => x.id === id);
      if (t) {
        resetTheme();
        applyTheme(t.variables);
      }
    } else {
      resetTheme();
    }
  }

  function reset() {
    resetTheme();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="btn btn-primary" onClick={newThemeFromCurrent}>
          + 从当前配色新建
        </button>
        <button className="btn" onClick={reset}>
          重置为默认
        </button>
      </div>

      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
        当前项目主题：
        <select
          className="select"
          value={manifestThemeId ?? ""}
          onChange={(e) => applyAsProjectTheme(e.target.value || null)}
          style={{ marginLeft: 8, width: 220 }}
        >
          <option value="">默认（跟随所选主题）</option>
          <optgroup label="内置">
            {BUILTIN_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
          {themes.length > 0 && (
            <optgroup label="项目主题">
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {/* 左：主题列表 */}
        <div style={{ minWidth: 180 }}>
          <SectionLabel>内置</SectionLabel>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {BUILTIN_THEMES.map((t) => (
              <ThemeItem
                key={t.id}
                name={t.name}
                selected={
                  selection?.type === "builtin" && selection.theme.id === t.id
                }
                onSelect={() => selectBuiltin(t)}
              />
            ))}
          </ul>

          <SectionLabel style={{ marginTop: 12 }}>
            项目主题（{themes.length}）
          </SectionLabel>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {themes.length === 0 && (
              <li
                style={{
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  padding: "4px 8px",
                }}
              >
                无
              </li>
            )}
            {themes.map((t) => (
              <ThemeItem
                key={t.id}
                name={t.name}
                selected={
                  selection?.type === "project" && selection.theme.id === t.id
                }
                onSelect={() => selectProjectTheme(t)}
                onDelete={() => remove(t.id)}
              />
            ))}
          </ul>
        </div>

        {/* 右：编辑 */}
        {draft && (
          <ThemeVariableEditor
            draft={draft}
            setDraft={setDraft}
            dirty={dirty}
            onSave={save}
            onUpdateVar={updateVar}
          />
        )}
      </div>
    </div>
  );
}
