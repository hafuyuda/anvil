import type { GridConfig } from "../../core/ipc";

interface Props {
  grid: GridConfig;
  width: number;
  height: number;
}

/**
 * 棋盘网格 SVG 层。
 * 支持 4 种形状：方格 / 点阵 / 横线 / 竖线。
 */
export function GridLayer({ grid, width, height }: Props) {
  if (!grid.visible || grid.size <= 0) return null;

  const step = grid.size;
  const shape = grid.shape ?? "square";
  const elements: React.ReactNode[] = [];

  if (shape === "square" || shape === "vertical") {
    for (let x = 0; x <= width; x += step) {
      elements.push(
        <line
          key={`vx${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="var(--border-subtle)"
          strokeWidth={0.5}
        />,
      );
    }
  }

  if (shape === "square" || shape === "horizontal") {
    for (let y = 0; y <= height; y += step) {
      elements.push(
        <line
          key={`hy${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="var(--border-subtle)"
          strokeWidth={0.5}
        />,
      );
    }
  }

  if (shape === "dots") {
    for (let x = 0; x <= width; x += step) {
      for (let y = 0; y <= height; y += step) {
        elements.push(
          <circle
            key={`d${x}-${y}`}
            cx={x}
            cy={y}
            r={1}
            fill="var(--border-default)"
          />,
        );
      }
    }
  }

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {elements}
    </svg>
  );
}
