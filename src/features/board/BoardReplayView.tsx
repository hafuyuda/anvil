import { useEffect, useMemo, useState } from "react";
import type { Board, GameEvent } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { isConsistent, replayAt, type TokenSnapshot } from "./engine";

interface Props {
  board: Board;
  events: GameEvent[];
  onExit: () => void;
}

/** 自动播放每步的间隔。 */
const STEP_MS = 600;

/**
 * 牌谱回放视图（只读）。
 *
 * 渲染用 SVG 示意图而不是真实卡面 —— 与 `BoardThumbnail` 同一套画法：
 * 按真实坐标画矩形 + 名称，卡盒 / 背面朝上用颜色区分。回放的重点是
 * 「谁在什么时候动了、动到哪」，不是卡面细节；示意图还能让这一步
 * 与棋盘列表里的缩略图对得上。
 *
 * 状态（第几步）由调用方持有还是自己持有：这里自己持有。回放是模态的
 * （进来就覆盖整个画布区），退出即销毁，没有跨组件共享的必要。
 */
export function BoardReplayView({ board, events, onExit }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const [step, setStep] = useState(events.length);
  const [playing, setPlaying] = useState(false);

  // 卡名查表：逐枚 find 是 O(T·C)，回放每步都要重画，不能省
  const nameById = useMemo(
    () => new Map(cards.map((c) => [c.id, c.name])),
    [cards],
  );

  const state = useMemo(() => replayAt(events, step), [events, step]);

  useEffect(() => {
    if (!playing) return;
    if (step >= events.length) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setStep(step + 1), STEP_MS);
    return () => window.clearTimeout(id);
  }, [playing, step, events.length]);

  function nameOf(t: TokenSnapshot): string {
    if (t.name_override) return t.name_override;
    if (t.card_id) return nameById.get(t.card_id) ?? "已删除的卡";
    return t.pile ? "卡盒" : "占位";
  }

  const atEnd = step >= events.length;
  const current = step > 0 ? events[step - 1] : null;
  const summary =
    current && typeof (current.payload as { summary?: unknown } | null)?.summary ===
      "string"
      ? (current.payload as { summary: string }).summary
      : null;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-app)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>回放</span>
        <button className="btn" onClick={() => setStep(Math.max(0, step - 1))}>
          上一步
        </button>
        <button
          className="btn"
          onClick={() => {
            if (atEnd) setStep(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? "暂停" : "播放"}
        </button>
        <button
          className="btn"
          onClick={() => setStep(Math.min(events.length, step + 1))}
        >
          下一步
        </button>
        <input
          type="range"
          min={0}
          max={events.length}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          style={{ flex: 1, minWidth: 80 }}
          aria-label="回放进度"
        />
        <span
          style={{
            fontSize: 12,
            minWidth: 62,
            textAlign: "right",
            color: "var(--fg-secondary)",
          }}
        >
          {step} / {events.length}
        </span>
        <button className="btn" onClick={onExit}>
          退出
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 12,
        }}
      >
        <svg
          viewBox={`0 0 ${board.width} ${board.height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            background: "var(--bg-raised)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {state.tokens.map((t) => {
            const w = t.w ?? 140;
            const h = t.h ?? 205;
            return (
              <g key={t.id}>
                <rect
                  x={t.x}
                  y={t.y}
                  width={w}
                  height={h}
                  rx={8}
                  fill={
                    t.pile
                      ? "var(--accent-gold)"
                      : t.face_down
                        ? "var(--fg-muted)"
                        : "var(--fg-secondary)"
                  }
                  opacity={0.85}
                />
                <text
                  x={t.x + w / 2}
                  y={t.y + h / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={22}
                  fill="var(--bg-app)"
                >
                  {t.face_down ? "背面" : nameOf(t)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: "6px 10px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minHeight: 44,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
          {step === 0 ? "开局（空棋盘）" : (summary ?? "（无摘要）")}
        </span>
        {state.degraded && (
          <span style={{ fontSize: 11, color: "var(--warning)" }}>
            牌谱残缺：{state.missingSteps.length} 步没有坐标（0.4.0 之前记录的），
            这些步骤无法重建，回放会跳过它们。
          </span>
        )}
        {atEnd && events.length > 0 && !isConsistent(state.tokens, board.tokens) && (
          <span style={{ fontSize: 11, color: "var(--warning)" }}>
            回放终点与棋盘当前状态不一致 —— 有动作没被记进牌谱（代码 bug，不是数据问题）。
          </span>
        )}
      </div>
    </div>
  );
}
