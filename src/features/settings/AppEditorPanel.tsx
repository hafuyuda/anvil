import { useState } from "react";
import {
  getAppSettings,
  setAppSettings,
  type AppSettings,
} from "../../lib/appSettings";
import { SectionLabel } from "../../components/ui/SectionLabel";

export function AppEditorPanel() {
  const [draft, setDraft] = useState<AppSettings>(() => getAppSettings());

  function update(patch: Partial<AppSettings>) {
    setDraft((d) => ({ ...d, ...patch }));
    setAppSettings(patch);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="自动保存延迟" hint={`${draft.autoSaveDelayMs} 毫秒`}>
        <input
          className="input"
          type="number"
          min={100}
          max={10000}
          step={100}
          value={draft.autoSaveDelayMs}
          onChange={(e) => {
            const n = Number(e.target.value) || 800;
            update({ autoSaveDelayMs: Math.max(100, Math.min(10000, n)) });
          }}
        />
      </Field>

      <Field label="最近项目上限" hint="只影响本机记录。缩小后已有列表不裁剪。">
        <input
          className="input"
          type="number"
          min={3}
          max={50}
          step={1}
          value={draft.recentProjectsMax}
          onChange={(e) => {
            const n = Number(e.target.value) || 10;
            update({ recentProjectsMax: Math.max(3, Math.min(50, n)) });
          }}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
          gap: 8,
        }}
      >
        <SectionLabel variant="field" style={{ marginBottom: 0 }}>
          {label}
        </SectionLabel>
        {hint && (
          <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
