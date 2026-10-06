import { useState, type ReactNode } from "react";

interface Item {
  id: string;
}

interface Props<T extends Item> {
  listLabel?: string;
  items: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  createLabel: string;
  renderItem: (item: T) => ReactNode;
  renderEditor: (item: T) => ReactNode;
  onDelete?: (item: T) => void;
  emptyHint: string;
  listWidth?: number;
  /** 列表头部的额外控件（如排序下拉） */
  listControls?: ReactNode;
}

export function EntityListLayout<T extends Item>({
  listLabel,
  items,
  selectedId,
  onSelect,
  onCreate,
  createLabel,
  renderItem,
  renderEditor,
  onDelete,
  emptyHint,
  listWidth = 200,
  listControls,
}: Props<T>) {
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: listWidth,
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: 10,
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <button className="btn btn-primary" onClick={onCreate}>
            {createLabel}
          </button>
          {listLabel && (
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-muted)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {listLabel}（{items.length}）
            </div>
          )}
          {listControls}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 4 }}>
          {items.length === 0 && (
            <div
              style={{
                padding: 12,
                fontSize: 12,
                color: "var(--fg-muted)",
                textAlign: "center",
              }}
            >
              还没有内容
            </div>
          )}
          {items.map((item) => {
            const active = item.id === selectedId;
            const hover = item.id === hoverId;
            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoverId(item.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => onSelect(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 4px 6px 10px",
                  cursor: "pointer",
                  borderLeft: active
                    ? "2px solid var(--accent-gold)"
                    : "2px solid transparent",
                  background: active ? "var(--bg-raised)" : "transparent",
                  color: active
                    ? "var(--fg-primary)"
                    : "var(--fg-secondary)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  userSelect: "none",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {renderItem(item)}
                </span>

                {onDelete && (hover || active) && (
                  <button
                    className="btn btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                    title="删除"
                    style={{
                      padding: "1px 6px",
                      fontSize: 12,
                      color: "var(--danger)",
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-app)",
          overflow: "hidden",
        }}
      >
        {selected ? (
          renderEditor(selected)
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--fg-muted)",
              fontSize: 12,
            }}
          >
            {emptyHint}
          </div>
        )}
      </div>
    </div>
  );
}