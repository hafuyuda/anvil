import { SIZE_MAP } from "../../types";
import type { CardStyleDef, CardStyleProps, SlotDef } from "../types";
import { CardImage } from "../../primitives/CardImage";
import { CardShell } from "../../primitives/CardShell";
import { readImage, readText } from "../slotUtils";

/**
 * 纯图片卡框：整张卡就是一张图。
 * 无标题、无类型线、无属性行。
 * 无图时显示卡名前两字（类型色）。
 *
 * slots 只声明 image —— 编辑器里只出现一个「图像字段」配置项。
 * 未绑定 source 时 mapContent 会走 findImageField 兜底（类型里第一个 image 字段）。
 */
const IMAGE_SLOTS: SlotDef[] = [
  { key: "image", kind: "image", label: "图像字段" },
];

export function CardFrameImage({
  cardType,
  size = "medium",
  content,
  selected = false,
  onClick,
}: CardStyleProps) {
  const spec = SIZE_MAP[size];
  const accent = cardType.color ?? "var(--card-frame-default-accent)";

  const image = readImage(content.slots.image);
  const title = readText(content.slots.title);

  return (
    <CardShell
      width={spec.w}
      height={spec.h}
      borderRadius={spec.borderRadius}
      padding={0}
      background={`color-mix(in srgb, ${accent} 18%, var(--card-generic-bg))`}
      shadow="var(--card-generic-shadow)"
      shadowSelected="var(--card-generic-shadow-selected)"
      accent={accent}
      selected={selected}
      onClick={onClick}
      // CardImage fullBleed 需要 positioned 父级；overflow hidden 让圆角生效
      style={{ position: "relative", overflow: "hidden" }}
    >
      <CardImage
        path={image}
        crop={content.crop}
        fullBleed
        borderRadius={0}
        fallback={
          <div
            style={{
              fontSize: spec.titleSize * 3,
              fontFamily: "var(--font-title)",
              fontWeight: 700,
              color: accent,
              letterSpacing: 2,
              userSelect: "none",
            }}
          >
            {title.slice(0, 2) || "?"}
          </div>
        }
      />
    </CardShell>
  );
}

export default {
  id: "image",
  label: "纯图片",
  Component: CardFrameImage,
  slots: IMAGE_SLOTS,
} satisfies CardStyleDef;
