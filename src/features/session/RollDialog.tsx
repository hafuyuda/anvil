import { useState } from "react";
import { Modal } from "../../components/Modal";
import type { RollInfo } from "../../core/ipc";

interface Props {
  onRoll: (roll: RollInfo, note: string) => void;
  onClose: () => void;
}

export function RollDialog({ onRoll, onClose }: Props) {
  const [expr, setExpr] = useState("1d20");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function parseAndRoll(): RollInfo | null {
    const trimmed = expr.trim().toLowerCase();
    // 支持形式：NdM、NdM+K、NdM-K、纯数字
    const m = trimmed.match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (!m) {
      // 退化为纯数字
      const n = Number(trimmed);
      if (!Number.isNaN(n)) {
        return { expr: trimmed, result: n, detail: [n] };
      }
      return null;
    }
    const count = m[1] ? Number(m[1]) : 1;
    const face = Number(m[2]);
    const mod = m[3] ? Number(m[3]) : 0;
    if (count < 1 || count > 100 || face < 2 || face > 1000) {
      return null;
    }
    const detail: number[] = [];
    for (let i = 0; i < count; i++) {
      detail.push(Math.floor(Math.random() * face) + 1);
    }
    const sum = detail.reduce((a, b) => a + b, 0);
    return { expr: trimmed, result: sum + mod, detail };
  }

  function handleRoll() {
    const r = parseAndRoll();
    if (!r) {
      setError("表达式不合法，例：1d20、2d6+3、5");
      return;
    }
    onRoll(r, note);
    onClose();
  }

  return (
    <Modal
      title="掷骰"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>取消</button>
          <button onClick={handleRoll}>掷</button>
        </>
      }
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "#888" }}>表达式</span>
        <input
          value={expr}
          onChange={(e) => {
            setExpr(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRoll();
          }}
          style={{
            padding: "6px 8px",
            fontSize: 14,
            fontFamily: "monospace",
          }}
          autoFocus
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "#888" }}>说明（可选）</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：洞察检定"
          style={{ padding: "4px 6px" }}
        />
      </label>

      {error && <div style={{ fontSize: 12, color: "#c33" }}>{error}</div>}

      <div style={{ fontSize: 11, color: "#aaa" }}>
        支持：1d20、2d6+3、3d8-2、纯数字
      </div>
    </Modal>
  );
}
