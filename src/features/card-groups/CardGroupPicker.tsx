import type { Card, CardType } from "../../core/ipc";

interface Props {
  pickQuery: string;
  setPickQuery: (q: string) => void;
  candidateCards: Card[];
  typeById: Map<string, CardType>;
  picked: Map<string, number>;
  totalCards: number;
  onSetCount: (id: string, count: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CardGroupPicker({
  pickQuery,
  setPickQuery,
  candidateCards,
  typeById,
  picked,
  totalCards,
  onSetCount,
  onCancel,
  onConfirm,
}: Props) {
  const totalCount = Array.from(picked.values()).reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <input
        className="input"
        autoFocus
        value={pickQuery}
        onChange={(e) => setPickQuery(e.target.value)}
        placeholder="搜索卡牌名或类型…"
      />

      <div
        style={{
          maxHeight: 260,
          overflowY: "auto",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-panel)",
        }}
      >
        {candidateCards.length === 0 && (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              color: "var(--fg-muted)",
              fontSize: 12,
            }}
          >
            {totalCards === 0 ? "项目里还没有卡牌" : "没有可添加的卡牌"}
          </div>
        )}
        {candidateCards.map((c) => {
          const t = typeById.get(c.type_id);
          const count = picked.get(c.id) ?? 0;
          return (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 10px",
                fontSize: 12,
                background: count > 0 ? "var(--bg-raised)" : "transparent",
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "var(--fg-primary)",
                }}
              >
                {c.name}
              </span>
              {t && (
                <span
                  style={{
                    color: "var(--fg-muted)",
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  {t.name}
                </span>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexShrink: 0,
                }}
              >
                <button
                  className="btn btn-icon"
                  onClick={() => onSetCount(c.id, count - 1)}
                  disabled={count === 0}
                  style={{ padding: "0 6px", fontSize: 12 }}
                >
                  −
                </button>
                <span
                  style={{
                    minWidth: 20,
                    textAlign: "center",
                    fontFamily: "var(--font-mono)",
                    color: count > 0 ? "var(--accent-gold)" : "var(--fg-muted)",
                  }}
                >
                  {count}
                </span>
                <button
                  className="btn btn-icon"
                  onClick={() => onSetCount(c.id, count + 1)}
                  style={{ padding: "0 6px", fontSize: 12 }}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
        }}
      >
        <button className="btn" onClick={onCancel} style={{ fontSize: 12 }}>
          取消
        </button>
        <button
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={totalCount === 0}
          style={{ fontSize: 12 }}
        >
          添加 {totalCount > 0 ? `(${totalCount})` : ""}
        </button>
      </div>
    </div>
  );
}
