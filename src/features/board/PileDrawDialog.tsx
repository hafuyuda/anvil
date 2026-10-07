import { useState } from "react";
import { Modal } from "../../components/Modal";
import type { PileData } from "../../core/ipc";

interface Props {
  pile: PileData;
  onDraw: (count: number) => void;
  onShuffle: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function PileDrawDialog({
  pile,
  onDraw,
  onShuffle,
  onReset,
  onClose,
}: Props) {
  const [count, setCount] = useState(1);

  const remaining = pile.remaining.length;
  const canDraw = remaining > 0;
  // 剩余数量少于初始，或顺序被打乱过 → 可重置
  const canReset =
    remaining !== pile.total || remaining !== pile.initial.length;

  function handleDraw() {
    if (!canDraw) return;
    const n = Math.max(1, Math.min(count, remaining));
    onDraw(n);
  }

  return (
    <Modal
      title={`卡盒：${pile.label}`}
      width={420}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            关闭
          </button>
          <button
            className="btn"
            onClick={onShuffle}
            disabled={remaining < 2}
            title={remaining < 2 ? "剩余不足，无需洗牌" : "打乱剩余顺序"}
          >
            洗牌
          </button>
          <button
            className="btn"
            onClick={onReset}
            disabled={!canReset}
            title="恢复成初始状态"
          >
            重置
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDraw}
            disabled={!canDraw}
          >
            抽 {Math.min(count, remaining)} 张
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            padding: "10px 14px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
            剩余
          </span>
          <span
            style={{
              fontSize: 18,
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              color: "var(--fg-primary)",
            }}
          >
            {remaining}
            <span
              style={{
                color: "var(--fg-muted)",
                fontSize: 12,
                marginLeft: 4,
              }}
            >
              / {pile.total}
            </span>
          </span>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 11,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            抽牌数量
          </span>
          <input
            className="input"
            type="number"
            min={1}
            max={Math.max(1, remaining)}
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleDraw();
            }}
            disabled={!canDraw}
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <div
            style={{
              fontSize: 11,
              color: "var(--fg-muted)",
              marginTop: 2,
              lineHeight: 1.5,
            }}
          >
            最多 {remaining} 张。抽出的牌放在卡盒右侧，扣着。
            <br />
            操作不关闭弹窗，可连续抽。
          </div>
        </label>

        {!canDraw && (
          <div
            style={{
              fontSize: 12,
              color: "var(--warning)",
              textAlign: "center",
              padding: 8,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
            }}
          >
            卡盒空了。点「重置」恢复。
          </div>
        )}
      </div>
    </Modal>
  );
}
