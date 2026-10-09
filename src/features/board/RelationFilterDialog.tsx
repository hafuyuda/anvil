import { useState } from "react";
import type { RelationKind } from "../../core/ipc";
import { Modal } from "../../components/Modal";

interface Props {
  relationKinds: RelationKind[];
  selected: string[];
  onChange: (kinds: string[]) => void;
  onClose: () => void;
}

export function RelationFilterDialog({
  relationKinds,
  selected,
  onChange,
  onClose,
}: Props) {
  const [local, setLocal] = useState<string[]>(selected);

  function toggle(id: string) {
    setLocal((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function clear() {
    setLocal([]);
  }

  function confirm() {
    onChange(local);
    onClose();
  }

  return (
    <Modal
      title="关系类型过滤"
      width={420}
      onClose={onClose}
      footer={
        <>
          <button
            className="btn"
            onClick={clear}
            style={{ marginRight: "auto" }}
          >
            清空（显示全部）
          </button>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={confirm}>
            应用
          </button>
        </>
      }
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          marginBottom: 8,
          lineHeight: 1.5,
        }}
      >
        勾选表示只显示勾选的关系类型。全部不勾 = 显示全部。
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {relationKinds.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
            项目里还没有关系类型
          </div>
        )}
        {relationKinds.map((k) => (
          <label
            key={k.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--fg-secondary)",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: "var(--radius-sm)",
              background: local.includes(k.id)
                ? "var(--bg-raised)"
                : "transparent",
            }}
          >
            <input
              type="checkbox"
              checked={local.includes(k.id)}
              onChange={() => toggle(k.id)}
              style={{ accentColor: "var(--accent-gold)" }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: k.color ?? "var(--accent-gold)",
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1 }}>{k.name}</span>
            {!k.directed && (
              <span style={{ fontSize: 10, color: "var(--fg-muted)" }}>
                无向
              </span>
            )}
          </label>
        ))}
      </div>
    </Modal>
  );
}
