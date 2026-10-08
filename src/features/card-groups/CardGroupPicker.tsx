import type { Card, CardType } from "../../core/ipc";

interface Props {
  pickQuery: string;
  setPickQuery: (q: string) => void;
  candidateCards: Card[];
  typeById: Map<string, CardType>;
  picked: Set<string>;
  totalCards: number;
  onToggle: (id: string) => void;
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
  onToggle,
  onCancel,
  onConfirm,
}: Props) {
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
          const checked = picked.has(c.id);
          return (
            <label
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 10px",
                cursor: "pointer",
                fontSize: 12,
                background: checked ? "var(--bg-raised)" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(c.id)}
                style={{ accentColor: "var(--accent-gold)" }}
              />
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
            </label>
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
          disabled={picked.size === 0}
          style={{ fontSize: 12 }}
        >
          添加 {picked.size > 0 ? `(${picked.size})` : ""}
        </button>
      </div>
    </div>
  );
}
