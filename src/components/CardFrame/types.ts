export type CardFrameSize = "small" | "medium" | "large";
export type CardFrameStyle = "yugioh" | "generic";

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
}

export const SIZE_MAP: Record<CardFrameSize, SizeSpec> = {
  small: {
    w: 140,
    h: 205,
    padding: 6,
    titleSize: 9,
    metaSize: 8,
    bodySize: 8,
    typeSize: 8,
    statSize: 9,
    borderRadius: 6,
  },
  medium: {
    w: 190,
    h: 280,
    padding: 8,
    titleSize: 11,
    metaSize: 10,
    bodySize: 10,
    typeSize: 10,
    statSize: 11,
    borderRadius: 8,
  },
  large: {
    w: 260,
    h: 385,
    padding: 10,
    titleSize: 14,
    metaSize: 12,
    bodySize: 12,
    typeSize: 12,
    statSize: 14,
    borderRadius: 10,
  },
};
