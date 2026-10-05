import type { ReactNode } from "react";

interface Item {
  id: string;
}

interface Props<T extends Item> {
  /** 左侧列表标题，空则不显示 */
  listLabel?: string;
  items: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  createLabel: string;
  renderItem: (item: T) => ReactNode;
  renderEditor: (item: T) => ReactNode;
  emptyHint: string;
  /** 左栏宽度，默认 200 */
  listWidth?: number;
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
  emptyHint,
  listWidth = 200,
}: Props<T>) {
  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {/* 左栏 */}
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
            return (
              <div
                key={item.id}
                onClick={() => onSelect(item.id)}
                style={{
                  padding: "6px 10px",
                  cursor: "pointer",
                  borderLeft: active
                    ? "2px solid var(--accent-gold)"
                    : "2px solid transparent",
                  background: active ? "var(--bg-raised)" : "transparent",
                  color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  borderRadius: 0,
                  userSelect: "none",
                }}
              >
                {renderItem(item)}
              </div>
            );
          })}
        </div>
      </div>

      {/* 右栏 */}
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
