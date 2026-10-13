import type { ComponentType } from "react";

/** 注册表 Panel 组件统一接收的 props。无需求的 Panel 可以不声明参数。 */
export interface CategoryPanelProps {
  /** 保存项目主题 id（外观分类使用） */
  onSaveTheme: (id: string | null) => Promise<void>;
}

/**
 * 一个设置分类的注册描述。
 * 新增分类只需在 `categories/impl/` 下加一个 .tsx 并默认导出本对象：
 * 左 NAV、搜索、键盘切换、requiresProject 过滤全部自动生效。
 */
export interface CategoryDef {
  /** 唯一 id，存进 uiStore.settingsCategory */
  id: string;
  /** NAV / 搜索结果显示名 */
  label: string;
  /** NAV 图标字形 */
  glyph: string;
  /** 搜索关键词（小写匹配） */
  keywords: string[];
  /** true = 未打开项目时隐藏 */
  requiresProject: boolean;
  /** 左 NAV 顺序，小的在前 */
  order: number;
  /** 右栏渲染的 Panel */
  Panel: ComponentType<CategoryPanelProps>;
}
