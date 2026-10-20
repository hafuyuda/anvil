import { useState } from "react";
import type {
  Board,
  Card,
  CardType,
  Session,
  SessionViewMode,
  Token,
} from "../../core/ipc";
import { BoardCanvas } from "../board/BoardCanvas";
import { PartyPanel } from "./PartyPanel";
import type { CardStat } from "./cardStats";

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
  view: SessionViewMode;
  onUpdateCard: (card: Card) => void;
  onQuickCheck: (stat: CardStat, card: Card) => void;
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
  view,
  onUpdateCard,
  onQuickCheck,
}: Props) {
  const [partyCollapsed, setPartyCollapsed] = useState(false);

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

      {partyCollapsed ? (
        <div
          style={{
            width: 28,
            borderLeft: "1px solid var(--border-subtle)",
            background: "var(--bg-panel)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 8,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setPartyCollapsed(false)}
            title="展开队伍面板"
            style={{ padding: "2px 6px", fontSize: 12, lineHeight: 1 }}
          >
            ⟩
          </button>
          <span
            style={{
              marginTop: 10,
              writingMode: "vertical-rl",
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            队伍
          </span>
        </div>
      ) : (
        <PartyPanel
          session={session}
          cards={cards}
          cardTypes={cardTypes}
          selectedTokenId={selectedTokenId}
          onSelectToken={onSelectToken}
          onUpdateCard={onUpdateCard}
          onQuickCheck={onQuickCheck}
          view={view}
          onCollapse={() => setPartyCollapsed(true)}
        />
      )}
    </div>
  );
}
