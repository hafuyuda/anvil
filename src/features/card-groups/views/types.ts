import type { ComponentType } from "react";
import type { Card, CardType } from "../../../core/ipc";

/** 卡组视图组件的渲染输入。两种视图 props 完全一致。 */
export interface CardGroupViewProps {
  /** 卡组内的卡 ID 列表（有序，允许重复） */
  cardIds: string[];
  cardById: Map<string, Card>;
  typeById: Map<string, CardType>;
  /** 拖拽排序回调 */
  onReorder: (next: string[]) => void;
  /** 移除一份（count - 1），count 归零时整项消失 */
  onRemoveOne: (cardId: string) => void;
}

/**
 * 一个卡组视图的注册描述。
 * 新增视图只需在 `views/impl/` 下加一个文件并默认导出本对象。
 */
export interface CardGroupViewDef {
  /** 唯一 id，存进 uiSlice.cardGroupView */
  id: string;
  /** 切换器 title / 提示显示的名字 */
  label: string;
  /** 切换按钮上的字形图标 */
  icon: string;
  /** 排序权重，小的在前 */
  order: number;
  /** 真正渲染的组件（自带 DnD 上下文与拖拽逻辑） */
  Component: ComponentType<CardGroupViewProps>;
}
