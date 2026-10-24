import type { GridShapeDef } from "../types";

const def: GridShapeDef = {
  id: "square",
  label: "方格",
  order: 10,
  render: ({ size: step, width, height, offsetX, offsetY }) => {
    const ox = ((offsetX % step) + step) % step;
    const oy = ((offsetY % step) + step) % step;
    const elements: React.ReactNode[] = [];
    for (let x = ox; x <= width; x += step) {
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
