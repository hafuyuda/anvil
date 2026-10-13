import { SIZE_MAP } from "../../types";
import type { CardStyleDef, CardStyleProps } from "../types";
import { CardImage } from "../../primitives/CardImage";
import { CardShell } from "../../primitives/CardShell";
import { CardInner } from "../../primitives/CardInner";

export function CardFramePokemon({
  cardType,
  size = "medium",
  content,
  selected = false,
  onClick,
}: CardStyleProps) {
  const spec = SIZE_MAP[size];
  const accent = cardType.color ?? "var(--card-frame-default-accent)";

  const displayBody =
    content.body.length > 0 ? content.body : (cardType.description ?? "");

  const accentStrong = `color-mix(in srgb, ${accent} 70%, #000)`;
  const titleBarBg = `linear-gradient(180deg, color-mix(in srgb, ${accent} 85%, #fff) 0%, ${accent} 100%)`;

  const hpText =
    content.hp !== undefined
      ? `${content.hpLabel ?? "HP"} ${content.hp}`
      : null;

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
              fontSize: spec.titleSize + 1,
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
            title={content.title}
          >
            {content.title}
          </span>
          {hpText && (
            <span
              style={{
                fontSize: spec.statSize + 1,
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
            path={content.image}
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
                  {content.title.slice(0, 2) || "?"}
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
            }}
          >
            {displayBody && (
              <div
                style={{
                  fontSize: spec.bodySize,
                  lineHeight: 1.4,
                  color: "var(--card-pokemon-fullart-text)",
                  textShadow,
                  whiteSpace: "pre-wrap",
                  overflow: "hidden",
                }}
                title={
                  Array.isArray(displayBody)
                    ? displayBody.join("\n\n")
                    : displayBody
                }
              >
                {displayBody}
              </div>
            )}

            {(content.atk !== undefined || content.def !== undefined) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  fontSize: spec.statSize,
                  fontWeight: 700,
                  color: "var(--card-pokemon-fullart-text)",
                  fontFamily: "var(--font-mono)",
                  paddingTop: 3,
                  borderTop: "1px solid var(--card-pokemon-fullart-divider)",
                  textShadow,
                }}
              >
                {content.atk !== undefined && (
                  <span>
                    <span style={{ opacity: 0.75 }}>
                      {content.atkLabel ?? "ATK"}
                    </span>{" "}
                    {content.atk}
                  </span>
                )}
                {content.def !== undefined && (
                  <span>
                    <span style={{ opacity: 0.75 }}>
                      {content.defLabel ?? "DEF"}
                    </span>{" "}
                    {content.def}
                  </span>
                )}
              </div>
            )}

            {(content.subtitle ||
              content.typeLine ||
              content.level !== undefined) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 6,
                  fontSize: spec.typeSize,
                  color: "var(--card-pokemon-fullart-text-dim)",
                  fontStyle: content.subtitle ? "normal" : "italic",
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
                  }}
                  title={content.subtitle ?? content.typeLine}
                >
                  {content.subtitle ?? content.typeLine}
                </span>
                {content.level !== undefined && (
                  <span
                    style={{ fontFamily: "var(--font-mono)", flexShrink: 0 }}
                    title={content.levelLabel}
                  >
                    {content.levelLabel ? `${content.levelLabel} ` : "Lv "}
                    {content.level}
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
} satisfies CardStyleDef;
