import type { Card, CardType } from "../../../core/ipc";
import type { CardFrameSize } from "../CardFrame";

export interface CardGridProps {
  children: React.ReactNode;
  /** 卡片间距，默认 12 */
  gap?: number;
  /** 顶部内边距，默认 0 */
  paddingTop?: number;
}

export interface GridCardProps {
  card: Card | null;
  cardType: CardType | null;
  size?: CardFrameSize;
  selected?: boolean;
  foil?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  /** 右上角浮层（移除按钮 / 选中徽章等） */
  overlay?: React.ReactNode;
  /** 转发给外层容器（供 @dnd-kit 的 setNodeRef 用） */
  wrapperRef?: React.Ref<HTMLDivElement>;
  /** 转发给外层容器（供 @dnd-kit 的 attributes/listeners 用） */
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
  /** 覆盖外层容器样式（transform / opacity 等） */
  style?: React.CSSProperties;
}
