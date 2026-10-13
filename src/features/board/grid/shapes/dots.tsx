import type { GridShapeDef } from "../types";

const def: GridShapeDef = {
  id: "dots",
  label: "点阵",
  order: 20,
  render: ({ size: step, width, height }) => {
    const elements: React.ReactNode[] = [];
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
    return elements;
  },
};

export default def;
