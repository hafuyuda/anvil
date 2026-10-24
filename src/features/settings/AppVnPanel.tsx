import { useState } from "react";
import {
  getAppSettings,
  setAppSettings,
  type AppSettings,
} from "../../lib/appSettings";
import { SectionLabel } from "../../components/ui/SectionLabel";
import { Toggle } from "../../components/ui/Toggle";

export function AppVnPanel() {
  const [draft, setDraft] = useState<AppSettings>(() => getAppSettings());

  function update(patch: Partial<AppSettings>) {
    setDraft((d) => ({ ...d, ...patch }));
    setAppSettings(patch);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="打字机速度" hint={`${draft.typewriterSpeed} 毫秒 / 字`}>
        <input
          type="range"
          min={5}
          max={150}
          step={5}
          value={draft.typewriterSpeed}
          onChange={(e) => update({ typewriterSpeed: Number(e.target.value) })}
          style={{ width: "100%" }}
        />
      </Field>

      <Toggle
        label="启用打字机效果"
        checked={draft.typewriterEnabled}
        onChange={(v) => update({ typewriterEnabled: v })}
      />

      <Toggle
        label="旁白也使用打字机"
        checked={draft.typewriterNarration}
        onChange={(v) => update({ typewriterNarration: v })}
        disabled={!draft.typewriterEnabled}
      />
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
