import type { Board } from "../../core/ipc";

interface Props {
  board: Board;
  width?: number;
  height?: number;
}

/**
 * 棋盘缩略图：按 token 的真实坐标和尺寸画出来的迷你布局图。
 *
 * 刻意不做成截图 —— 截图要渲染真实卡面、要等资源加载、棋盘一改还得重截。
 * 示意图零依赖、随棋盘数据即时更新，在列表里够用了。
 *
 * 卡盒、背面朝上的 token 用不同颜色区分，一眼能看出棋盘的「成分」。
 */
export function BoardThumbnail({ board, width = 56, height = 38 }: Props) {
  const tokens = (board.tokens ?? []).filter((t) => t.visible !== false);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${board.width} ${board.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      style={{
        display: "block",
        flexShrink: 0,
        border: "1px solid var(--border-subtle)",
        borderRadius: 3,
        background: "var(--bg-raised)",
      }}
    >
      {tokens.map((t) => (
        <rect
          key={t.id}
          x={t.x}
          y={t.y}
          width={t.w ?? 140}
          height={t.h ?? 205}
          rx={8}
          fill={
            t.pile
              ? "var(--accent-gold)"
              : t.face_down
                ? "var(--fg-muted)"
                : "var(--fg-secondary)"
          }
          opacity={0.8}
        />
      ))}
    </svg>
  );
}
