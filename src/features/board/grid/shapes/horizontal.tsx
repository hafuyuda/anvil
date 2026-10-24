import type { GridShapeDef } from "../types";

const def: GridShapeDef = {
  id: "horizontal",
  label: "横线",
  order: 30,
  render: ({ size: step, width, height, offsetY }) => {
    const oy = ((offsetY % step) + step) % step;
    const elements: React.ReactNode[] = [];
    for (let y = oy; y <= height; y += step) {
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
