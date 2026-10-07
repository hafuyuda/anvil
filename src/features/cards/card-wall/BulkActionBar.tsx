interface Props {
  count: number;
  visibleCount: number;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onAddToGroup: () => void;
  onAddToBoard: () => void;
  onDelete: () => void;
}

export function BulkActionBar({
  count,
  visibleCount,
  onSelectAllVisible,
  onClearSelection,
  onAddToGroup,
  onAddToBoard,
  onDelete,
}: Props) {
  if (count <= 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "6px 12px",
        background: "var(--bg-raised)",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      <span style={{ color: "var(--accent-gold)", fontWeight: 600 }}>
        已选 {count} 张
      </span>
      <button
        className="btn"
        onClick={onSelectAllVisible}
        style={{ fontSize: 11 }}
      >
        全选可见（{visibleCount}）
      </button>
      <button
        className="btn"
        onClick={onClearSelection}
        style={{ fontSize: 11 }}
      >
        取消选择
      </button>
      <div style={{ flex: 1 }} />
      <button className="btn" onClick={onAddToGroup} style={{ fontSize: 11 }}>
        → 加入卡组
      </button>
      <button className="btn" onClick={onAddToBoard} style={{ fontSize: 11 }}>
        → 添加到棋盘
      </button>
      <button
        className="btn btn-danger"
        onClick={onDelete}
        style={{ fontSize: 11 }}
      >
        删除
      </button>
    </div>
  );
}
