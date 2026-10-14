export function VNStageEnding({ name }: { name: string | null }) {
  return (
    <div
      style={{
        margin: "16px 16px 0",
        padding: "16px 20px",
        background: "linear-gradient(135deg, #3d3427 0%, #2a231a 100%)",
        border: "1px solid var(--accent-gold)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--accent-gold)",
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 6,
          fontFamily: "var(--font-mono)",
        }}
      >
        — 结局 —
      </div>
      {name ? (
        <div
          style={{
            fontSize: 22,
            fontFamily: "var(--font-title)",
            fontWeight: 600,
            color: "var(--fg-primary)",
            letterSpacing: 1,
          }}
        >
          {name}
        </div>
      ) : (
        <div
          style={{
            fontSize: 18,
            fontFamily: "var(--font-title)",
            color: "var(--fg-secondary)",
          }}
        >
          故事到此结束
        </div>
      )}
    </div>
  );
}
