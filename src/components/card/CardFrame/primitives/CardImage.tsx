import type { CSSProperties, ReactNode } from "react";
import type { CropRect } from "../../../../core/ipc";
import { useAssetUrl } from "../../../../hooks/useAssetUrl";

interface Props {
  path: string | null | undefined;
  crop?: CropRect | null;
  /** 图像区固定高度（像素） */
  height?: number;
  /** 图像区圆角 */
  borderRadius: number;
  /** 图像区边框（CSS border 值） */
  border?: string;
  /** 图像区背景 */
  background?: string;
  /** 无图时渲染的内容 */
  fallback: ReactNode;
  /** 铺满父容器（absolute inset:0），忽略 height */
  fullBleed?: boolean;
}

/**
 * 卡牌图像区。支持裁剪（crop）。
 */
export function CardImage({
  path,
  crop,
  height,
  borderRadius,
  border,
  background,
  fallback,
  fullBleed = false,
}: Props) {
  const url = useAssetUrl(path);

  if (fullBleed) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          background,
        }}
      >
        {url ? (
          <CropImage url={url} crop={crop} />
        ) : (
          <div style={FALLBACK_STYLE}>{fallback}</div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        height,
        flexShrink: 0,
        borderRadius,
        overflow: "hidden",
        border,
        background,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {url ? (
          <CropImage url={url} crop={crop} />
        ) : (
          <div style={FALLBACK_STYLE}>{fallback}</div>
        )}
      </div>
    </div>
  );
}

const FALLBACK_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/**
 * 应用裁剪的图片。
 * crop 为 null 或等效于全图时，走 objectFit: cover 的简单路径。
 */
function CropImage({ url, crop }: { url: string; crop?: CropRect | null }) {
  const isFull =
    !crop || (crop.x === 0 && crop.y === 0 && crop.w === 1 && crop.h === 1);

  if (isFull) {
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          userSelect: "none",
        }}
      />
    );
  }

  // 裁剪：img 放大到容器尺寸的 1/w × 1/h，再平移到 crop 区域对齐
  const c = crop!;
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      loading="lazy"
      decoding="async"
      style={{
        position: "absolute",
        width: `${100 / c.w}%`,
        height: `${100 / c.h}%`,
        left: `${(-c.x / c.w) * 100}%`,
        top: `${(-c.y / c.h) * 100}%`,
        objectFit: "cover",
        display: "block",
        userSelect: "none",
        pointerEvents: "none",
      }}
    />
  );
}
