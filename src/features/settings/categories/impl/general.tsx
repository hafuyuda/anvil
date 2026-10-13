import type { CategoryDef } from "../types";
import { ProjectGeneralPanel } from "../../ProjectGeneralPanel";

const def: CategoryDef = {
  id: "general",
  label: "常规",
  glyph: "◆",
  keywords: [
    "项目",
    "名称",
    "版本",
    "作者",
    "描述",
    "卡背",
    "卡框",
    "project",
    "name",
    "author",
    "version",
    "description",
  ],
  requiresProject: true,
  order: 10,
  Panel: ProjectGeneralPanel,
};

export default def;
