interface Props {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onFlip?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onConnect?: () => void;
}

export function BoardBottomBar({
  count,
  onClear,
  onDelete,
  onFlip,
  onBringToFront,
  onSendToBack,
  onConnect,
}: Props) {
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
      {onConnect && (
        <button
          className="btn"
          onClick={onConnect}
          style={{ fontSize: 11, padding: "2px 8px" }}
        >
          连线
        </button>
      )}
      {onFlip && (
        <button
          className="btn"
          onClick={onFlip}
          style={{ fontSize: 11, padding: "2px 8px" }}
        >
          翻转
        </button>
      )}
      {onBringToFront && (
        <button
          className="btn"
          onClick={onBringToFront}
          style={{ fontSize: 11, padding: "2px 8px" }}
        >
          置顶
        </button>
      )}
      {onSendToBack && (
        <button
          className="btn"
          onClick={onSendToBack}
          style={{ fontSize: 11, padding: "2px 8px" }}
        >
          置底
        </button>
      )}
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
