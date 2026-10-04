import { useProjectStore } from "../stores/projectStore";
import { CardEditor } from "../features/cards/CardEditor";
import { TokenInspector } from "../features/board/TokenInspector";

export function Inspector() {
  const selectedCardId = useProjectStore((s) => s.selectedCardId);
  const selectedTokenId = useProjectStore((s) => s.selectedTokenId);
  const currentBoardId = useProjectStore((s) => s.currentBoardId);
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const boards = useProjectStore((s) => s.boards) ?? [];

  const board = currentBoardId
    ? (boards.find((b) => b.id === currentBoardId) ?? null)
    : null;
  const token =
    selectedTokenId && board
      ? ((board.tokens ?? []).find((t) => t.id === selectedTokenId) ?? null)
      : null;

  const card = cards.find((c) => c.id === selectedCardId) ?? null;
  const cardType = card
    ? (cardTypes.find((t) => t.id === card.type_id) ?? null)
    : null;

  return (
    <div
      style={{
        width: 300,
        borderLeft: "1px solid #e0e0e0",
        background: "#fafafa",
        padding: 12,
        overflow: "auto",
        fontSize: 13,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#999",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {token ? "Token" : "检查器"}
      </div>

      {token && board && (
        <TokenInspector key={token.id} board={board} token={token} />
      )}

      {!token && card && !cardType && (
        <p style={{ color: "#c33", fontSize: 12 }}>
          找不到卡牌类型 {card.type_id}
        </p>
      )}

      {!token && card && cardType && (
        <CardEditor key={card.id} card={card} cardType={cardType} />
      )}

      {!token && !card && <p style={{ color: "#aaa" }}>未选中对象</p>}
    </div>
  );
}
