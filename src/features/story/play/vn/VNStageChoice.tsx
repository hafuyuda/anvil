export function VNStageChoice({
  jumps,
  onChoose,
}: {
  jumps: { target: string }[];
  onChoose: (target: string) => void;
}) {
  return (
    <div
      style={{
        margin: 16,
        padding: 16,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        maxHeight: "60vh",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        选择
      </div>

      {jumps.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
          没有可走的选项
        </div>
      )}

      {jumps.map((j, i) => (
        <div
          key={i}
          onClick={() => onChoose(j.target)}
          style={{
            padding: "10px 14px",
            marginBottom: 6,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: "var(--fg-primary)",
                fontWeight: 600,
                flex: 1,
              }}
            >
              {j.target}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
