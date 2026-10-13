import type { GridShapeDef } from "../types";

const def: GridShapeDef = {
  id: "vertical",
  label: "竖线",
  order: 40,
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
    return elements;
  },
};

export default def;
