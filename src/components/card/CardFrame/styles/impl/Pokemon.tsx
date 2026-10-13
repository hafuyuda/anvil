import { SIZE_MAP } from "../../types";
import type { CardStyleDef, CardStyleProps, SlotDef } from "../types";
import { CardImage } from "../../primitives/CardImage";
import { CardShell } from "../../primitives/CardShell";
import { CardInner } from "../../primitives/CardInner";
import { readText, readStat, readBody, readImage } from "../slotUtils";

const POKEMON_SLOTS: SlotDef[] = [
  { key: "title", kind: "text", label: "标题", defaultSource: "name" },
  { key: "hp", kind: "stat", label: "HP", defaultStatLabel: "HP" },
  { key: "type_line", kind: "text", label: "类型行" },
  { key: "level", kind: "stat", label: "等级" },
  { key: "body", kind: "body", label: "描述" },
  { key: "image", kind: "image", label: "图像" },
];

export function CardFramePokemon({
  cardType,
  size = "medium",
  content,
  selected = false,
  onClick,
}: CardStyleProps) {
  const spec = SIZE_MAP[size];
  const accent = cardType.color ?? "var(--card-frame-default-accent)";

  const title = readText(content.slots.title);
  const hp = readStat(content.slots.hp);
  const hpText = hp ? `${hp.label ?? "HP"} ${hp.value}` : null;
  const typeLine = readText(content.slots.type_line);
  const level = readStat(content.slots.level);
  const bodyLines = readBody(content.slots.body);
  const displayBody =
    bodyLines.length > 0 ? bodyLines.join("\n") : (cardType.description ?? "");
  const imagePath = readImage(content.slots.image);

  // ── 字号缩放（small 缩、large 微放） ──
  const fontScale = size === "small" ? 0.85 : size === "large" ? 1.05 : 1.0;
  const titleFontSize = Math.round((spec.titleSize + 1) * fontScale);
  const statFontSize = Math.round((spec.statSize + 1) * fontScale);
  const bodyFontSize = Math.round(spec.bodySize * fontScale);
  const typeFontSize = Math.round(spec.typeSize * fontScale);

  // ── 描述最大行数 ──
  const bodyClamp = size === "small" ? 3 : 4;

  // ── 过渡渐变高度 ──
  const transitionHeight = size === "small" ? 12 : size === "large" ? 20 : 16;

  const accentStrong = `color-mix(in srgb, ${accent} 70%, #000)`;
  const titleBarBg = `linear-gradient(180deg, color-mix(in srgb, ${accent} 85%, #fff) 0%, ${accent} 100%)`;

  const pad = Math.round(spec.w * 0.05);
  const barPadY = Math.round(spec.h * 0.022);

  const textShadow = "0 1px 2px rgba(0,0,0,0.9)";

  return (
    <CardShell
      width={spec.w}
      height={spec.h}
      borderRadius={spec.borderRadius + 2}
      padding={4}
      background="linear-gradient(160deg, var(--card-pokemon-outer-1) 0%, var(--card-pokemon-outer-2) 100%)"
      shadow="var(--card-pokemon-shadow)"
      shadowSelected="var(--card-pokemon-shadow-selected)"
      accent={accent}
      selected={selected}
      onClick={onClick}
    >
      <CardInner
        borderRadius={spec.borderRadius}
        padding={0}
        background="var(--card-pokemon-fullart-bg)"
        border="1px solid var(--card-pokemon-inner-border)"
        gap={0}
      >
        {/* 顶部标题栏：实体条，类型色渐变 */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            padding: `${barPadY}px ${pad}px`,
            background: titleBarBg,
            borderBottom: `2px solid ${accentStrong}`,
          }}
        >
          <span
            style={{
              fontSize: titleFontSize,
              fontWeight: 700,
              color: "#fff",
              textShadow: "0 1px 1px rgba(0,0,0,0.35)",
              fontFamily: "var(--font-title)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
              lineHeight: 1.15,
            }}
            title={title}
          >
            {title}
          </span>
          {hpText && (
            <span
              style={{
                fontSize: statFontSize,
                fontWeight: 700,
                color: "var(--card-pokemon-fullart-hp)",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                lineHeight: 1.15,
              }}
            >
              {hpText}
            </span>
          )}
        </div>

        {/* 全图区 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <CardImage
            path={imagePath}
            crop={content.crop}
            fullBleed
            borderRadius={0}
            background={`linear-gradient(160deg, color-mix(in srgb, ${accent} 35%, var(--card-pokemon-art-bg)) 0%, var(--card-pokemon-art-bg) 100%)`}
            fallback={
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingBottom: "30%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    fontSize: spec.titleSize * 3.2,
                    fontFamily: "var(--font-title)",
                    fontWeight: 700,
                    color: accentStrong,
                    letterSpacing: 4,
                    userSelect: "none",
                  }}
                >
                  {title.slice(0, 2) || "?"}
                </div>
              </div>
            }
          />

          {/* 底部半透明技能面板 */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: `${Math.round(pad * 0.8)}px ${pad}px`,
              background: "var(--card-pokemon-fullart-panel)",
              borderTop: "1px solid var(--card-pokemon-fullart-divider)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              pointerEvents: "none",
              maxHeight: "60%",
              overflow: "hidden",
            }}
          >
            {/* 面板顶部过渡渐变（覆盖在面板上方） */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: transitionHeight,
                transform: "translateY(-100%)",
                background:
                  "linear-gradient(0deg, var(--card-pokemon-fullart-panel) 0%, transparent 100%)",
                pointerEvents: "none",
              }}
            />

            {displayBody && (
              <div
                style={{
                  fontSize: bodyFontSize,
                  lineHeight: 1.4,
                  color: "var(--card-pokemon-fullart-text)",
                  textShadow,
                  whiteSpace: "pre-wrap",
                  display: "-webkit-box",
                  WebkitLineClamp: bodyClamp,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
                title={displayBody}
              >
                {displayBody}
              </div>
            )}

            {(typeLine || level) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 6,
                  fontSize: typeFontSize,
                  color: "var(--card-pokemon-fullart-text-dim)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.9)",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    minWidth: 0,
                    fontStyle: typeLine ? "normal" : "italic",
                  }}
                  title={typeLine}
                >
                  {typeLine}
                </span>
                {level && (
                  <span
                    style={{ fontFamily: "var(--font-mono)", flexShrink: 0 }}
                    title={level.label ?? undefined}
                  >
                    {level.label ? `${level.label} ` : "Lv "}
                    {level.value}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardInner>
    </CardShell>
  );
}

export default {
  id: "pokemon",
  label: "宝可梦",
  Component: CardFramePokemon,
  slots: POKEMON_SLOTS,
} satisfies CardStyleDef;
