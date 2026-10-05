import type { Card, CardType, Session } from "../../core/ipc";

interface Props {
  session: Session;
  cards: Card[];
  cardTypes: CardType[];
  selectedTokenId: string | null;
  onSelectToken: (id: string | null) => void;
}

export function PartyPanel({
  session,
  cards,
  cardTypes,
  selectedTokenId,
  onSelectToken,
}: Props) {
  // 去重：同一张卡只显示一次（可能有多个 token 指向同一张卡）
  const seen = new Set<string>();
  const entries: {
    tokenId: string;
    card: Card;
    cardType: CardType;
  }[] = [];

  for (const t of session.tokens) {
    if (!t.card_id || seen.has(t.card_id)) continue;
    const c = cards.find((x) => x.id === t.card_id);
    if (!c) continue;
    const ct = cardTypes.find((x) => x.id === c.type_id);
    if (!ct) continue;
    seen.add(t.card_id);
    entries.push({ tokenId: t.id, card: c, cardType: ct });
  }

  return (
    <div
      style={{
        width: 200,
        borderLeft: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          flexShrink: 0,
        }}
      >
        在场角色（{entries.length}）
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 4 }}>
        {entries.length === 0 && (
          <div
            style={{
              padding: 12,
              fontSize: 12,
              color: "var(--fg-muted)",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            没有角色
            <br />
            从卡片墙加 Token 到棋盘
          </div>
        )}

        {entries.map((e) => {
          const active = selectedTokenId === e.tokenId;
          return (
            <div
              key={e.tokenId}
              onClick={() => onSelectToken(e.tokenId)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                background: active ? "var(--bg-raised)" : "transparent",
                borderLeft: active
                  ? "2px solid var(--accent-gold)"
                  : "2px solid transparent",
                userSelect: "none",
              }}
            >
              <Avatar name={e.card.name} color={e.cardType.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: active
                      ? "var(--fg-primary)"
                      : "var(--fg-secondary)",
                    fontWeight: active ? 600 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.card.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.cardType.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Avatar({
  name,
  color,
}: {
  name: string;
  color?: string | null;
}) {
  const letter = name.slice(0, 1);
  const c = color ?? "var(--fg-secondary)";
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: `${c}33`,
        border: `1px solid ${c}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--fg-primary)",
        flexShrink: 0,
      }}
      title={name}
    >
      {letter}
    </div>
  );
}