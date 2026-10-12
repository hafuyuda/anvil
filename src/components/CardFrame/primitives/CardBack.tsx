import { SIZE_MAP, type CardFrameSize } from "../types";
import { useAssetUrl } from "../../../hooks/useAssetUrl";
import { getCardBackStyle, hasCardBackStyle } from "./back-styles/registry";

interface Props {
  /**
   * 已解析的卡背 id。可以是：
   *   - 已注册的风格 id（如 "anvil"、"rune"）
   *   - 图片路径（旧数据兼容，如 "assets/back.png"）
   *   - null / undefined（回退默认风格 anvil）
   */
  styleId?: string | null;
  size?: CardFrameSize;
  /** 可选：类型级强调色，传给卡背风格组件 */
  accent?: string;
}

/**
 * 卡背渲染。优先级解析在调用方完成，本组件只负责查表。
 *
 * 兼容旧数据：如果 styleId 是图片路径（未注册的风格 id），
 * 仍按图片渲染；否则走注册表风格。
 */
// styleId 为已注册风格 id → 渲染对应风格
// styleId 为旧图片路径（未注册）→ 渲染 <img>，兼容旧项目
// styleId 为空或未知 → 回退 anvil
export function CardBack({ styleId, size = "small", accent }: Props) {
  const spec = SIZE_MAP[size];

  // 旧数据兼容：styleId 不是已注册风格 id 时，尝试按图片路径渲染
  const isImagePath = styleId != null && !hasCardBackStyle(styleId);
  const url = useAssetUrl(isImagePath ? styleId : null);

  if (isImagePath && url) {
    return (
      <div
        style={{
          width: spec.w,
          height: spec.h,
          borderRadius: spec.borderRadius,
          overflow: "hidden",
          flexShrink: 0,
          border: "1px solid var(--card-back-border)",
          boxShadow: "var(--card-back-shadow)",
        }}
      >
        <img
          src={url}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            userSelect: "none",
          }}
        />
      </div>
    );
  }

  const def = getCardBackStyle(styleId);
  const StyleComponent = def.Component;
  return <StyleComponent size={size} accent={accent} />;
}
