import type { CategoryDef } from "../types";
import { ProjectResourcesPanel } from "../../ProjectResourcesPanel";

const def: CategoryDef = {
  id: "resources",
  label: "资源",
  glyph: "▣",
  keywords: ["图片", "资源", "导入", "image", "asset", "import"],
  requiresProject: true,
  order: 30,
  Panel: ProjectResourcesPanel,
};

export default def;
