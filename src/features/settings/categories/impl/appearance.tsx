import type { CategoryDef } from "../types";
import { AppearancePanel } from "../../AppearancePanel";

const def: CategoryDef = {
  id: "appearance",
  label: "外观",
  glyph: "◈",
  keywords: [
    "主题",
    "配色",
    "颜色",
    "缩放",
    "字体",
    "界面",
    "theme",
    "color",
    "font",
    "zoom",
    "scale",
  ],
  requiresProject: false,
  order: 20,
  Panel: AppearancePanel,
};

export default def;
