import { useEffect, useState } from "react";
import { loadAsset } from "../../../../lib/assetCache";

interface Props {
  speaker: string;
  emotion?: string | null;
  /** 卡名 + 表情 → 立绘资源路径（同步映射） */
  lookup: (speaker: string, emotion?: string | null) => string | null;
  side: "left" | "right";
}

/**
 * 立绘层：按说话人名字匹配项目卡，从卡的 portrait_<表情> / portrait 字段取图。
 * 资源 URL 异步加载；入场用 transform/opacity 动画，尊重 prefers-reduced-motion。
 * 整层 pointer-events: none，不拦截舞台点击。
 */
export function PortraitLayer({ speaker, emotion, lookup, side }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const path = lookup(speaker, emotion);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    loadAsset(path)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) return null;

  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <img
        src={url}
        alt={speaker}
        draggable={false}
        style={{
          position: "absolute",
          bottom: 0,
          [side]: 24,
          height: "82%",
          maxWidth: "42%",
          objectFit: "contain",
          objectPosition:
            side === "left" ? "bottom left" : "bottom right",
          userSelect: "none",
          pointerEvents: "none",
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))",
          animation: reduceMotion
            ? undefined
            : `vn-portrait-${side}-in 320ms ease-out`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 8,
          [side]: 24,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--accent-gold)",
          background: "rgba(0,0,0,0.45)",
          padding: "2px 10px",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-title)",
          pointerEvents: "none",
        }}
      >
        {speaker}
      </div>
    </div>
  );
}
