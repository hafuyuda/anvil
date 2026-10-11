import type { SettingsCategory } from "../../stores/uiStore";

export interface CategoryMeta {
  key: SettingsCategory;
  label: string;
  glyph: string;
  keywords: string[];
  requiresProject: boolean;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "general",
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
  },
  {
    key: "appearance",
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
  },
  {
    key: "resources",
    label: "资源",
    glyph: "▣",
    keywords: ["图片", "资源", "导入", "image", "asset", "import"],
    requiresProject: true,
  },
  {
    key: "editor",
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
  },
  {
    key: "advanced",
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
  },
];
