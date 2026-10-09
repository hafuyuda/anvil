export type FoilVariant = "gold" | "silver";

const VARIANTS: Record<
  FoilVariant,
  { base: string; shine: string; edge: string }
> = {
  gold: {
    base: "var(--card-foil-base)",
    shine: "var(--card-foil-shine)",
    edge: "var(--card-foil-edge)",
  },
  silver: {
    base: "var(--card-foil-silver-base)",
    shine: "var(--card-foil-silver-shine)",
    edge: "var(--card-foil-silver-edge)",
  },
};

interface Props {
  radius: number;
  variant?: FoilVariant;
}

export function FoilOverlay({ radius, variant = "gold" }: Props) {
  const c = VARIANTS[variant];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: c.base,
          opacity: 0.18,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        <div
          className="card-foil-shine"
          style={{
            position: "absolute",
            inset: "-50%",
            background: `linear-gradient(115deg, transparent 45%, ${c.shine} 50%, transparent 55%)`,
            animation:
              "card-foil-sweep var(--card-foil-duration, 6s) linear infinite",
            opacity: 0.6,
            willChange: "transform",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `1px solid ${c.edge}`,
          borderRadius: radius,
          opacity: 0.55,
        }}
      />
    </div>
  );
}
