import type { SettingsCategory } from "../../stores/uiStore";

export interface CategoryMeta {
  key: SettingsCategory;
  label: string;
  group: "project" | "app";
}

export const CATEGORIES: CategoryMeta[] = [
  { key: "project:general", label: "常规", group: "project" },
  { key: "project:theme", label: "主题", group: "project" },
  { key: "project:resources", label: "资源", group: "project" },
  { key: "project:data", label: "数据", group: "project" },

  { key: "app:interface", label: "界面", group: "app" },
  { key: "app:editor", label: "编辑器", group: "app" },
  { key: "app:vn", label: "视觉小说", group: "app" },
  { key: "app:advanced", label: "高级", group: "app" },
];

export const DEFAULT_PROJECT_CATEGORY: SettingsCategory = "project:general";
export const DEFAULT_APP_CATEGORY: SettingsCategory = "app:interface";