import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import type { GameEvent } from "../../core/ipc";
import { toast } from "../../lib/toast";
import {
  extractBoardSteps,
  findStartSnapshot,
  formatReplayText,
  formatStep,
  replayTo,
  type SnapshotToken,
} from "./boardRecord";

interface Props {
  events: GameEvent[];
  boardWidth: number;
  boardHeight: number;
  onSeedSnapshot: () => Promise<void>;
  onClose: () => void;
}

/** 回放区宽度。Modal 宽 760，减去内边距。 */
const STAGE_W = 688;
/** 小于这个尺寸就别缩了，看不清 */
const MIN_TOKEN_W = 46;

export function BoardReplay({
  events,
  boardWidth,
  boardHeight,
  onSeedSnapshot,
  onClose,
}: Props) {
  const steps = useMemo(() => extractBoardSteps(events), [events]);
  const start = useMemo(() => findStartSnapshot(events), [events]);

  // 打开面板时就停在最新一步
  const [index, setIndex] = useState(steps.length);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (index >= steps.length) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), 700);
    return () => clearTimeout(timer);
  }, [playing, index, steps.length]);

  const records = useMemo(() => steps.map((s) => s.step), [steps]);
  const board = useMemo(() => {
    if (!start) return [];
    return replayTo(start, records, index);
  }, [start, records, index]);

  const k = Math.min(1, STAGE_W / Math.max(1, boardWidth));
  const current = index > 0 ? steps[index - 1] : null;

  async function copyReplay() {
    const text = formatReplayText(steps);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("牌谱已复制到剪贴板");
    } catch {
      toast.error("复制失败，剪贴板不可用");
    }
  }

  return (
    <Modal
      title="牌谱回放"
      width={760}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={() => void copyReplay()} disabled={steps.length === 0}>
            复制牌谱
          </button>
          <button className="btn" onClick={onClose}>
            关闭
          </button>
        </>
      }
    >
      {!start ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
            本会话还没有棋盘快照，无法回放。快照在「切换棋盘」时记录 —— 旧会话可以在顶栏重新选一次棋盘，或点下面的按钮以当前布局作为起点。
          </div>
          <div>
            <button className="btn" onClick={() => void onSeedSnapshot()}>
              以当前棋盘建立起点
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              position: "relative",
              width: STAGE_W,
              height: Math.max(200, boardHeight * k),
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
            }}
          >
            {board
              .filter((t) => t.visible)
              .sort((a, b) => a.layer - b.layer)
              .map((t) => (
                <ReplayToken key={t.id} token={t} k={k} />
              ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              上一步
            </button>
            <button
              className="btn"
              onClick={() => setPlaying((p) => !p)}
              disabled={steps.length === 0 || index >= steps.length}
            >
              {playing ? "暂停" : "播放"}
            </button>
            <button
              className="btn"
              onClick={() => setIndex((i) => Math.min(steps.length, i + 1))}
              disabled={index >= steps.length}
            >
              下一步
            </button>
            <input
              type="range"
              min={0}
              max={steps.length}
              value={index}
              onChange={(e) => {
                setPlaying(false);
                setIndex(Number(e.target.value));
              }}
              style={{ flex: 1 }}
            />
            <span
              style={{
                fontSize: 12,
                color: "var(--fg-secondary)",
                minWidth: 62,
                textAlign: "right",
              }}
            >
              {index} / {steps.length}
            </span>
          </div>

          <div
            style={{
              padding: "8px 10px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: current ? "var(--fg-primary)" : "var(--fg-muted)",
              minHeight: 34,
              display: "flex",
              alignItems: "center",
            }}
          >
            {current ? formatStep(current.step) : "起点 · 尚未落子"}
          </div>

          {current?.note && (
            <div style={{ fontSize: 12, color: "var(--accent-gold)" }}>
              备注：{current.note}
            </div>
          )}

          {steps.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                maxHeight: 180,
                overflow: "auto",
              }}
            >
              {steps.map((s, i) => (
                <button
                  key={s.seq}
                  onClick={() => {
                    setPlaying(false);
                    setIndex(i + 1);
                  }}
                  style={{
                    textAlign: "left",
                    fontSize: 11,
                    padding: "3px 6px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    cursor: "pointer",
                    background:
                      index === i + 1 ? "var(--bg-raised)" : "transparent",
                    color:
                      index === i + 1
                        ? "var(--fg-primary)"
                        : "var(--fg-secondary)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {String(i + 1).padStart(3, " ")}. {formatStep(s.step)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/**
 * 回放里的 token 只示意位置与状态，不重现实体卡的渲染。
 * 名字是随事件存的，卡牌即使被删也照样显示。
 */
function ReplayToken({ token, k }: { token: SnapshotToken; k: number }) {
  const w = Math.max(MIN_TOKEN_W, (token.w ?? 100) * k);
  const h = Math.max(MIN_TOKEN_W * 0.9, (token.h ?? 140) * k);

  return (
    <div
      style={{
        position: "absolute",
        left: token.x * k,
        top: token.y * k,
        width: w,
        height: h,
        boxSizing: "border-box",
        padding: 4,
        borderRadius: 6,
        border: token.is_pile
          ? "1px solid var(--accent-copper)"
          : "1px solid var(--border-subtle)",
        background: token.is_pile ? "var(--bg-panel)" : "var(--bg-raised)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: token.is_pile
            ? "var(--accent-copper)"
            : "var(--fg-primary)",
          textAlign: "center",
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {token.name}
      </span>
      {token.is_pile && (
        <span style={{ fontSize: 10, color: "var(--fg-secondary)" }}>
          剩 {token.pile_remaining ?? 0}
        </span>
      )}
      {!token.is_pile && token.face_down && (
        <span style={{ fontSize: 10, color: "var(--fg-muted)" }}>扣着</span>
      )}
    </div>
  );
}
