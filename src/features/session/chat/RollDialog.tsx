import { useState } from "react";
import { Modal } from "../../../components/Modal";
import type { RollInfo } from "../../../core/ipc";
import { DICE_ERROR_HINT, rollDice } from "../../../lib/dice";

interface Props {
  onRoll: (roll: RollInfo, note: string) => void;
  onClose: () => void;
}

export function RollDialog({ onRoll, onClose }: Props) {
  const [expr, setExpr] = useState("1d20");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleRoll() {
    const r = rollDice(expr);
    if (!r) {
      setError(DICE_ERROR_HINT);
      return;
    }
    onRoll({ expr: r.expr, result: r.result, detail: r.detail }, note);
    onClose();
  }

  return (
    <Modal
      title="掷骰"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleRoll}>
            掷
          </button>
        </>
      }
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          表达式
        </span>
        <input
          className="input"
          value={expr}
          onChange={(e) => {
            setExpr(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRoll();
          }}
          style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}
          autoFocus
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          说明（可选）
        </span>
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：洞察检定"
        />
      </label>

      {error && (
        <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>
      )}

      <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
        支持：1d20、2d6+3、3d8-2、纯数字
      </div>
    </Modal>
  );
}