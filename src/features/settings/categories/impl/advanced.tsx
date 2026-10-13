import type { CategoryDef } from "../types";
import { AdvancedPanel } from "../../AdvancedPanel";

const def: CategoryDef = {
  id: "advanced",
  label: "高级",
  glyph: "⚙",
  keywords: [
    "统计",
    "索引",
    "重建",
    "诊断",
    "缓存",
    "重置",
    "stats",
    "index",
    "diagnostic",
    "cache",
    "reset",
  ],
  requiresProject: false,
  order: 50,
  Panel: AdvancedPanel,
};

export default def;
