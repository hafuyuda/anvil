import type { CategoryDef } from "../types";
import { EditorPanel } from "../../EditorPanel";

const def: CategoryDef = {
  id: "editor",
  label: "编辑器",
  glyph: "✎",
  keywords: [
    "自动保存",
    "保存",
    "延迟",
    "最近项目",
    "打字机",
    "速度",
    "旁白",
    "autosave",
    "recent",
    "typewriter",
    "speed",
    "narration",
  ],
  requiresProject: false,
  order: 40,
  Panel: EditorPanel,
};

export default def;
