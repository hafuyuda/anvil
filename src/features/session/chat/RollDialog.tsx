import { useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import type { RollInfo } from "../../../core/ipc";
import { DICE_ERROR_HINT, rollDice } from "../../../lib/dice";
import { getAppSettings, setAppSettings } from "../../../lib/appSettings";

interface Props {
  /** 快捷掷骰预填：表达式。不传则沿用上次使用的表达式。 */
  initialExpr?: string;
  /** 快捷掷骰预填：说明文字 */
  initialNote?: string;
  onRoll: (roll: RollInfo, note: string) => void;
  onClose: () => void;
}

export function RollDialog({
  initialExpr,
  initialNote,
  onRoll,
  onClose,
}: Props) {
  const [expr, setExpr] = useState(
    () => initialExpr ?? getAppSettings().lastRollExpr,
  );
  const [note, setNote] = useState(initialNote ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleRoll() {
    const r = rollDice(expr);
    if (!r) {
      setError(DICE_ERROR_HINT);
      return;
    }
    setAppSettings({ lastRollExpr: r.expr });
    onRoll(
      {
        expr: r.expr,
        result: r.result,
        detail: r.detail,
        dropped: r.dropped,
      },
      note,
    );
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

      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginTop: 8,
        }}
      >
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
          placeholder="例如：侦察"
        />
      </label>

      {error && (
        <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>
      )}

      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>
        支持：1d20、2d6+3、1d8-2、4d6dl1、2d20kh1、1d20+1d4、d%、纯数字
      </div>
    </Modal>
  );
}
