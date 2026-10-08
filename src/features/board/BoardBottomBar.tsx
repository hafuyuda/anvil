interface Props {
  count: number;
  onClear: () => void;
  onDelete: () => void;
}

export function BoardBottomBar({ count, onClear, onDelete }: Props) {
  if (count === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
        padding: "4px 8px",
        background: "var(--bg-raised)",
        borderRadius: "var(--radius-md)",
        marginLeft: "auto",
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--accent-gold)",
          fontWeight: 600,
        }}
      >
        已选 {count}
      </span>
      <button
        className="btn"
        onClick={onClear}
        style={{ fontSize: 11, padding: "2px 8px" }}
      >
        取消
      </button>
      <button
        className="btn btn-danger"
        onClick={onDelete}
        style={{ fontSize: 11, padding: "2px 8px" }}
      >
        删除
      </button>
    </div>
  );
}
