import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import { ipc } from "../../core/ipc";
import type { PresetInfo } from "../../core/ipc/types";
import { useAddPreset } from "../../hooks/useAddPreset";

interface Props {
  onClose: () => void;
}

/**
 * 「添加预设」弹窗：列出内置预设，点击即作为副本导入当前项目。
 */
export function AddPresetDialog({ onClose }: Props) {
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const addPreset = useAddPreset();

  useEffect(() => {
    ipc
      .listPresets()
      .then(setPresets)
      .finally(() => setLoading(false));
  }, []);

  async function handlePick(id: string) {
    setBusy(id);
    const ok = await addPreset(id);
    setBusy(null);
    if (ok) onClose();
  }

  return (
    <Modal title="添加预设" onClose={onClose} width={480}>
      {loading ? (
        <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>加载中…</div>
      ) : presets.length === 0 ? (
        <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>
          没有可用预设
        </div>
      ) : (
        presets.map((p) => (
          <button
            key={p.id}
            onClick={() => handlePick(p.id)}
            disabled={busy !== null}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              marginBottom: 8,
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              color: "var(--fg-primary)",
              cursor: busy ? "wait" : "pointer",
              fontFamily: "inherit",
              opacity: busy && busy !== p.id ? 0.5 : 1,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              {p.label}
              {busy === p.id && (
                <span
                  style={{
                    color: "var(--fg-muted)",
                    marginLeft: 8,
                    fontSize: 12,
                  }}
                >
                  添加中…
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              {p.description}
            </div>
          </button>
        ))
      )}
    </Modal>
  );
}
