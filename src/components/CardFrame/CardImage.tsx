import type { CSSProperties, ReactNode } from "react";
import type { CropRect, ImageExtend } from "../../core/ipc";
import { useImageUrl } from "../../hooks/useImageUrl";

interface Props {
  path: string | null | undefined;
  crop?: CropRect | null;
  extend?: ImageExtend | null;
  /** 图像区固定高度（像素） */
  height: number;
  /** 图像区圆角 */
  borderRadius: number;
  /** 图像区边框（CSS border 值）。出框时自动隐藏 */
  border?: string;
  /** 图像区背景 */
  background?: string;
  /** 无图时渲染的内容 */
  fallback: ReactNode;
}

/**
 * 卡牌图像区。支持裁剪（crop）和出框（extend）。
 * 出框通过内层绝对定位容器向外扩张实现，外容器保持原始占位。
 */
export function CardImage({
  path,
  crop,
  extend,
  height,
  borderRadius,
  border,
  background,
  fallback,
}: Props) {
  const url = useImageUrl(path);

  const isExtending =
    !!extend &&
    (extend.top > 0 ||
      extend.bottom > 0 ||
      extend.left > 0 ||
      extend.right > 0);

  // 内层容器：绝对定位，四方向根据 extend 向外扩张。
  // 百分比相对图像区自身尺寸：
  //   top/bottom → 图像区高度
  //   left/right → 图像区宽度
  const innerStyle: CSSProperties = {
    position: "absolute",
    top: isExtending ? `-${extend!.top * 100}%` : 0,
    bottom: isExtending ? `-${extend!.bottom * 100}%` : 0,
    left: isExtending ? `-${extend!.left * 100}%` : 0,
    right: isExtending ? `-${extend!.right * 100}%` : 0,
    borderRadius: isExtending ? borderRadius : 0,
    overflow: "hidden",
  };

  return (
    <div
      style={{
        height,
        flexShrink: 0,
        borderRadius,
        // 出框时允许溢出，不出框时隐藏圆角外的内容
        overflow: isExtending ? "visible" : "hidden",
        border: isExtending ? "none" : border,
        background: isExtending ? "transparent" : background,
        position: "relative",
        zIndex: isExtending ? 10 : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={innerStyle}>
        {url ? (
          <CropImage url={url} crop={crop} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {fallback}
          </div>
        )}
      </div>
    </div>
  );
}

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
