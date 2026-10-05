import type { Card, CardType, Session } from "../../core/ipc/ipc";
import { CardFrame } from "../../components/CardFrame";

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
        width: 176,
        borderLeft: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        padding: 8,
        overflow: "auto",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          padding: "0 2px",
        }}
      >
        角色（{entries.length}）
      </div>

      {entries.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-muted)",
            padding: "0 2px",
            lineHeight: 1.5,
          }}
        >
          没有角色卡。
          <br />
          从卡片墙加 Token 到棋盘。
        </div>
      )}

      {entries.map((e) => (
        <CardFrame
          key={e.card.id}
          card={e.card}
          cardType={e.cardType}
          size="small"
          selected={selectedTokenId === e.tokenId}
          onClick={() => onSelectToken(e.tokenId)}
        />
      ))}
    </div>
  );
}
