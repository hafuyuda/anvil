export function VNStageChoice({
  choices,
  onChoose,
}: {
  choices: { label: string; index: number }[];
  onChoose: (index: number) => void;
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

      {choices.length === 0 && (
        <div className="muted">
          没有可走的选项
        </div>
      )}

      {choices.map((c) => (
        <div
          key={c.index}
          onClick={() => onChoose(c.index)}
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
              {c.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
