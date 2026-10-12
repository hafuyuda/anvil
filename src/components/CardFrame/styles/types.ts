import type { ComponentType } from "react";
import type { CardType } from "../../../core/ipc";
import type { CardFrameSize } from "../types";
import type { CardContent, CardFeatures } from "../mapping";

/**
 * 风格组件的渲染输入。
 *
 * 风格组件**只接收 content**：内容由 `mapContent` 产出，
 * 图像区的裁剪 / 出框由分派器从 features 合入；
 * 闪卡特性（foil / foilVariant）不进风格组件，由 `CardFrame`
 * 外层统一包 `FoilOverlay`。
 */
export type StyleContent = CardContent & Pick<CardFeatures, "crop" | "extend">;

export interface CardStyleProps {
  cardType: CardType;
  size?: CardFrameSize;
  content: StyleContent;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * 一个卡框风格的注册描述。
 * 新增风格只需在 `styles/impl/` 下加一个文件并默认导出本对象。
 */
export interface CardStyleDef {
  /** 持久化到项目数据里的风格 id（如 "yugioh"） */
  id: string;
  /** 风格下拉里显示的中文名 */
  label: string;
  Component: ComponentType<CardStyleProps>;
}
