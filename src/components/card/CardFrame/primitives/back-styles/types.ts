import type { ComponentType } from "react";
import type { CardFrameSize } from "../../types";

/**
 * 卡背风格组件的渲染输入。
 * 卡背组件**只接收 size 和可选 accent**，不读 card / cardType / manifest。
 */
export interface CardBackStyleProps {
  /** 卡背尺寸，与正面一致 */
  size: CardFrameSize;
  /** 可选：类型级强调色，用于主题联动 */
  accent?: string;
}

/**
 * 一个卡背风格的注册描述。
 * 新增卡背只需在 `back-styles/impl/` 下加一个文件并默认导出本对象。
 */
export interface CardBackStyleDef {
  /** 唯一 id，存进 card_back 字段 */
  id: string;
  /** 下拉 / 标签显示的名字 */
  label: string;
  /** 真正渲染的组件 */
  Component: ComponentType<CardBackStyleProps>;
}
