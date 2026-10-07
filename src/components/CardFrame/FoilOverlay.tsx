interface Props {
  /** 卡片圆角，与 SIZE_MAP[size].borderRadius 一致 */
  radius: number;
}

/**
 * 暗金闪卡覆盖层：静态暗金基色 + 斜向流光。
 * 放在卡片内容之上，pointerEvents: none，不影响交互。
 */
export function FoilOverlay({ radius }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        overflow: "hidden",
        pointerEvents: "none",
        // 让覆盖层的混合模式只影响卡片本身
        isolation: "isolate",
      }}
    >
      {/* 静态暗金基色 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--card-foil-base)",
          opacity: 0.4,
          mixBlendMode: "overlay",
        }}
      />

      {/* 斜向流光 */}
      <div
        className="card-foil-shine"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(115deg, transparent 35%, var(--card-foil-shine) 50%, transparent 65%)",
          backgroundSize: "250% 250%",
          animation:
            "card-foil-sweep var(--card-foil-duration, 6s) ease-in-out infinite",
          mixBlendMode: "screen",
          opacity: 0.75,
        }}
      />

      {/* 边缘暗金描边 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `1px solid var(--card-foil-edge)`,
          borderRadius: radius,
          opacity: 0.6,
        }}
      />
    </div>
  );
}
