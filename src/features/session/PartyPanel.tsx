import type { Card, CardType, Session } from "../../core/ipc";
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
  // 找出 session.tokens 里所有挂卡的 token（去重，一张卡只显示一个卡牌实例）
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
        borderLeft: "1px solid #eee",
        background: "#fafafa",
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
          fontSize: 11,
          color: "#888",
          textTransform: "uppercase",
          padding: "0 2px",
        }}
      >
        角色（{entries.length}）
      </div>

      {entries.length === 0 && (
        <div style={{ fontSize: 12, color: "#aaa", padding: "0 2px" }}>
          没有角色卡。先从卡片墙加 Token 到棋盘，或直接在棋盘上放置。
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
