import { useState } from "react";
import {
  getAppSettings,
  setAppSettings,
  type AppSettings,
} from "../../lib/appSettings";
import { applyFontScale } from "../../lib/fontScale";
import { SectionLabel } from "../../components/SectionLabel";

export function AppInterfacePanel() {
  const [draft, setDraft] = useState<AppSettings>(() => getAppSettings());

  function update(patch: Partial<AppSettings>) {
    setDraft((d) => ({ ...d, ...patch }));
    setAppSettings(patch);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="界面缩放" hint={`${Math.round(draft.fontScale * 100)}%`}>
        <input
          type="range"
          min={0.75}
          max={1.5}
          step={0.05}
          value={draft.fontScale}
          onChange={(e) => {
            const v = Number(e.target.value);
            update({ fontScale: v });
            applyFontScale(v);
          }}
          style={{ width: "100%", accentColor: "var(--accent-gold)" }}
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
