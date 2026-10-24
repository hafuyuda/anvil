import { useEffect, useState } from "react";
import {
  subscribeRefConfirm,
  TARGET_NOUN,
  type RefConfirmOptions,
  type RefConfirmResult,
} from "../../lib/refConfirm";
import { Modal } from "../ui/Modal";
import type { RefKind, RefTargetKind } from "../../core/ipc";

interface Pending extends RefConfirmOptions {
  id: string;
  resolve: (r: RefConfirmResult) => void;
}

/** 引用来源的中文名 */
const KIND_LABEL: Record<RefKind, string> = {
  board_token: "棋盘棋子",
  board_pile: "棋盘卡盒",
  session_party: "会话队伍",
  card_group: "卡组",
  card_type: "卡牌",
  relation: "关系",
};

/** 各目标种类对应的动作文案。没有 detach 的表示它只提供一条路。 */
const ACTIONS: Record<
  RefTargetKind,
  { remove: string; detach?: string }
> = {
  card: { remove: "移除棋子并删除", detach: "留个空位（标记已删除）" },
  board: { remove: "解除绑定并删除" },
  card_group: { remove: "移除卡盒并删除" },
};

/**
 * 「还有 N 处引用，怎么处理？」的宿主组件。
 *
 * 存在的意义是不静默级联删除：删一张卡悄悄清空半个棋盘，比留下悬空边更糟。
 * 所以这里把选择权交给用户。
 */
export function RefConfirmHost() {
  const [queue, setQueue] = useState<Pending[]>([]);

  useEffect(() => {
    return subscribeRefConfirm((req) => {
      setQueue((q) => [...q, req]);
    });
  }, []);

  const current = queue[0];
  if (!current) return null;

  function resolve(r: RefConfirmResult) {
    current.resolve(r);
    setQueue((q) => q.slice(1));
  }

  const noun = TARGET_NOUN[current.targetKind];
  const actions = ACTIONS[current.targetKind];
  const manual = current.hits.filter((h) => !h.auto);

  return (
    <Modal
      title={`删除${noun}`}
      width={460}
      onClose={() => resolve(null)}
      footer={
        <>
          <button className="btn" onClick={() => resolve(null)}>
            取消
          </button>
          {actions.detach && (
            <button
              className="btn"
              onClick={() => resolve("detach")}
              title="棋子留在原地，变成灰色占位块，你知道那儿曾经站着谁"
            >
              {actions.detach}
            </button>
          )}
          <button
            className="btn btn-danger"
            onClick={() => resolve("remove")}
            autoFocus
          >
            {actions.remove}
          </button>
        </>
      }
    >
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--fg-primary)",
        }}
      >
        「{current.targetName}」还被 {current.hits.length} 处引用：
      </div>

      <div
        style={{
          maxHeight: 220,
          overflow: "auto",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-surface)",
        }}
      >
        {current.hits.map((h, i) => (
          <div
            key={`${h.kind}-${h.owner_id}-${i}`}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              padding: "6px 10px",
              fontSize: 12,
              borderBottom:
                i === current.hits.length - 1
                  ? "none"
                  : "1px solid var(--border-subtle)",
            }}
          >
            <span
              style={{
                flex: "0 0 60px",
                color: "var(--fg-muted)",
                fontSize: 11,
              }}
            >
              {KIND_LABEL[h.kind]}
            </span>
            <span style={{ flex: 1, color: "var(--fg-secondary)" }}>
              {h.label}
            </span>
            {!h.auto && (
              <span
                style={{
                  flex: "0 0 auto",
                  fontSize: 10,
                  color: "var(--accent-copper)",
                }}
                title="它不会被自动清理，需要你自己去改"
              >
                需手动处理
              </span>
            )}
          </div>
        ))}
      </div>

      {manual.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.6 }}>
          标注「需手动处理」的 {manual.length} 项不会被改动 ——
          它们涉及卡本身，动它们等于替你改数据。
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.6 }}>
        注意：Ctrl+Z 会连上面这些改动一起还原，按原位置放回去；
        你在此之后又做的编辑不受影响。
      </div>
    </Modal>
  );
}
