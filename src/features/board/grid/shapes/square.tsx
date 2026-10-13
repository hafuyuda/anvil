import type { GridShapeDef } from "../types";

const def: GridShapeDef = {
  id: "square",
  label: "方格",
  order: 10,
  render: ({ size: step, width, height }) => {
    const elements: React.ReactNode[] = [];
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
    return elements;
  },
};

export default def;
