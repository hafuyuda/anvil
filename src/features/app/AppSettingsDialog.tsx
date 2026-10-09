import { useState } from "react";
import { Modal } from "../../components/Modal";
import {
  CARD_FRAME_STYLE_LABELS,
  type CardFrameStyle,
} from "../../components/CardFrame";
import {
  getAppSettings,
  resetAppSettings,
  setAppSettings,
  type AppSettings,
} from "../../lib/appSettings";
import { applyFontScale } from "../../lib/fontScale";
import { confirmDialog } from "../../lib/confirm";

interface Props {
  onClose: () => void;
}

const STYLE_OPTIONS: { value: CardFrameStyle; label: string }[] = (
  Object.keys(CARD_FRAME_STYLE_LABELS) as CardFrameStyle[]
).map((v) => ({ value: v, label: CARD_FRAME_STYLE_LABELS[v] }));

export function AppSettingsDialog({ onClose }: Props) {
  const [draft, setDraft] = useState<AppSettings>(() => getAppSettings());

  function update(patch: Partial<AppSettings>) {
    setDraft((d) => ({ ...d, ...patch }));
    setAppSettings(patch);
  }

  async function handleReset() {
    if (
      !(await confirmDialog({
        message: "恢复全部应用设置为默认值？",
        confirmLabel: "恢复",
        danger: true,
      }))
    )
      return;
    resetAppSettings();
    setDraft(getAppSettings());
  }

  return (
    <Modal
      title="应用设置"
      width={480}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={handleReset}>
            恢复默认
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            关闭
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Labeled label="默认卡框风格" hint="新建卡牌类型时使用">
          <select
            className="select"
            value={draft.defaultCardFrameStyle}
            onChange={(e) =>
              update({
                defaultCardFrameStyle: e.target.value as CardFrameStyle,
              })
            }
          >
            {STYLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Labeled>

        <Labeled label="打字机速度" hint={`${draft.typewriterSpeed} 毫秒 / 字`}>
          <input
            type="range"
            min={5}
            max={150}
            step={5}
            value={draft.typewriterSpeed}
            onChange={(e) =>
              update({ typewriterSpeed: Number(e.target.value) })
            }
            style={{ width: "100%", accentColor: "var(--accent-gold)" }}
          />
        </Labeled>

        <CheckRow
          label="启用打字机效果"
          hint="关闭后所有对白与动作一次显示完整。"
          checked={draft.typewriterEnabled}
          onChange={(v) => update({ typewriterEnabled: v })}
        />

        <CheckRow
          label="旁白也使用打字机"
          hint="默认关闭。开启后旁白也会逐字显示。"
          checked={draft.typewriterNarration}
          disabled={!draft.typewriterEnabled}
          onChange={(v) => update({ typewriterNarration: v })}
        />

        <Labeled label="自动保存延迟" hint={`${draft.autoSaveDelayMs} 毫秒`}>
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
        </Labeled>

        <Labeled
          label="最近项目上限"
          hint="只影响本机记录，不改动项目内容。缩小后已有列表不裁剪。"
        >
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
        </Labeled>
        <Labeled
          label="界面缩放"
          hint={`${Math.round(draft.fontScale * 100)}%`}
        >
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
        </Labeled>
      </div>
    </Modal>
  );
}

function Labeled({
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
          fontSize: 12,
          color: "var(--fg-secondary)",
          marginBottom: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span>{label}</span>
        {hint && (
          <span
            style={{
              fontSize: 11,
              color: "var(--fg-muted)",
              textAlign: "right",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function CheckRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        fontSize: 12,
        color: disabled ? "var(--fg-muted)" : "var(--fg-secondary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "var(--accent-gold)", marginTop: 2 }}
      />
      <div style={{ minWidth: 0 }}>
        <div>{label}</div>
        {hint && (
          <div
            style={{
              fontSize: 11,
              color: "var(--fg-muted)",
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {hint}
          </div>
        )}
      </div>
    </label>
  );
}
