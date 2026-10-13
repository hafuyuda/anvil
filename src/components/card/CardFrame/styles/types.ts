import type { ComponentType } from "react";
import type { CardType } from "../../../../core/ipc";
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
 * 一个卡框风格声明自己支持的槽位。
 * 与 `CardContent.slots` 的 key 一一对应。
 */
export interface SlotDef {
  /** 槽位 key，与 CardContent.slots 一致 */
  key: string;
  /** 槽位类型，与 SlotValue 的判别字段对应 */
  kind: "text" | "stat" | "body" | "image";
  /** 编辑器里显示的名字 */
  label: string;
  /** 默认绑到 card.values 的哪个 key */
  defaultSource?: string;
  /** stat 类型的默认标签（如 "HP"） */
  defaultStatLabel?: string;
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
  /**
   * 该风格支持的槽位。
   * 未声明时，编辑器按 legacy 字段处理（阶段 5 前其余风格保持不声明）。
   */
  slots?: SlotDef[];
}

/**
 * 未声明 slots 的风格（当前 5 个 legacy 风格）的兜底槽位定义。
 * 等价于 Stage 4 之前的固定字段集合。
 * 编辑器 / mapContent 遇到无 slots 声明的风格时用它。
 */
export const DEFAULT_SLOTS: SlotDef[] = [
  {
    key: "title",
    kind: "text",
    label: "标题字段（留空用卡名）",
    defaultSource: "name",
  },
  { key: "subtitle", kind: "text", label: "副标题" },
  { key: "type_line", kind: "text", label: "类型行（留空用类型名）" },
  { key: "image", kind: "image", label: "图像字段" },
  { key: "level", kind: "stat", label: "等级字段", defaultStatLabel: "★" },
  { key: "atk", kind: "stat", label: "攻击字段", defaultStatLabel: "ATK" },
  { key: "def", kind: "stat", label: "防御字段", defaultStatLabel: "DEF" },
  { key: "hp", kind: "stat", label: "HP 字段", defaultStatLabel: "HP" },
  {
    key: "body",
    kind: "body",
    label: "正文字段（可多选，按选择顺序显示）",
  },
];
