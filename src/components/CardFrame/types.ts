export type CardFrameSize = "small" | "medium" | "large";

export type CardFrameStyle =
  "yugioh" | "generic" | "minimal" | "mtg" | "pokemon";

export const DEFAULT_CARD_FRAME_STYLE: CardFrameStyle = "yugioh";

export const CARD_FRAME_STYLE_LABELS: Record<CardFrameStyle, string> = {
  yugioh: "游戏王",
  generic: "通用",
  minimal: "极简",
  mtg: "万智牌",
  pokemon: "宝可梦",
};

export function isCardFrameStyle(v: unknown): v is CardFrameStyle {
  return typeof v === "string" && v in CARD_FRAME_STYLE_LABELS;
}

export interface SizeSpec {
  w: number;
  h: number;
  padding: number;
  titleSize: number;
  metaSize: number;
  bodySize: number;
  typeSize: number;
  statSize: number;
  borderRadius: number;
  imageHeight: number;
}

export const SIZE_MAP: Record<CardFrameSize, SizeSpec> = {
  small: {
    w: 140,
    h: 205,
    padding: 6,
    titleSize: 9,
    metaSize: 8,
    bodySize: 7,
    typeSize: 8,
    statSize: 9,
    borderRadius: 6,
    imageHeight: 84,
  },
  medium: {
    w: 190,
    h: 280,
    padding: 8,
    titleSize: 11,
    metaSize: 10,
    bodySize: 9,
    typeSize: 10,
    statSize: 11,
    borderRadius: 8,
    imageHeight: 116,
  },
  large: {
    w: 260,
    h: 385,
    padding: 10,
    titleSize: 14,
    metaSize: 12,
    bodySize: 11,
    typeSize: 12,
    statSize: 14,
    borderRadius: 10,
    imageHeight: 160,
  },
};

export const CARD_ACCENT_PRESETS: { value: string; label: string }[] = [
  { value: "var(--accent-copper)", label: "铜" },
  { value: "var(--accent-gold)", label: "金" },
  { value: "var(--accent-ember)", label: "暗红" },
  { value: "var(--accent-flame)", label: "火" },
  { value: "var(--accent-steel)", label: "钢" },
  { value: "var(--accent-iron)", label: "铁" },
];
