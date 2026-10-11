import type { Board, Card, CardType, Session, Token } from "../../core/ipc";
import { BoardCanvas } from "../board/BoardCanvas";
import { PartyPanel } from "./PartyPanel";

interface Props {
  session: Session;
  board: Board | null;
  effectiveBoard: Board;
  cards: Card[];
  cardTypes: CardType[];
  zoom: number;
  onZoomChange: (z: number) => void;
  onPileClick: (tokenId: string) => void;
  onTokensChange: (tokens: Token[]) => void;
  selectedTokenId: string | null;
  onSelectToken: (id: string | null) => void;
}

export function SessionStage({
  session,
  board,
  effectiveBoard,
  cards,
  cardTypes,
  zoom,
  onZoomChange,
  onPileClick,
  onTokensChange,
  selectedTokenId,
  onSelectToken,
}: Props) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
        {board ? (
          <BoardCanvas
            board={effectiveBoard}
            zoom={zoom}
            onZoomChange={onZoomChange}
            onPileClick={onPileClick}
            onChange={(patch) => {
              if (patch.tokens) {
                onTokensChange(patch.tokens);
              }
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--fg-muted)",
              fontSize: 12,
            }}
          >
            请在顶栏选一个棋盘作为战场
          </div>
        )}
      </div>

      <PartyPanel
        session={session}
        cards={cards}
        cardTypes={cardTypes}
        selectedTokenId={selectedTokenId}
        onSelectToken={onSelectToken}
      />
    </div>
  );
}
