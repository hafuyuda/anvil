import type { GridShapeDef } from "../types";

const def: GridShapeDef = {
  id: "dots",
  label: "点阵",
  order: 20,
  render: ({ size: step, width, height, offsetX, offsetY }) => {
    const ox = ((offsetX % step) + step) % step;
    const oy = ((offsetY % step) + step) % step;
    const elements: React.ReactNode[] = [];
    for (let x = ox; x <= width; x += step) {
      for (let y = oy; y <= height; y += step) {
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
