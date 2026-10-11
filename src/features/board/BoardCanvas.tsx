import type { Board, GridConfig } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useAssetUrl } from "../../hooks/useAssetUrl";
import { BoardToken } from "./BoardToken";
import { RelationLines } from "./RelationLines";
import { GridLayer } from "./GridLayer";
import { useTokenDrag } from "./useTokenDrag";
import { useCanvasZoom } from "./useCanvasZoom";

interface Props {
  board: Board;
  zoom: number;
  onZoomChange: (z: number) => void;
  onChange: (patch: Partial<Board>) => void;
  onPileClick?: (tokenId: string) => void;
}

const DEFAULT_GRID: GridConfig = {
  size: 50,
  offset_x: 0,
  offset_y: 0,
  visible: true,
  snap: true,
};

const PADDING = 16;

export function BoardCanvas({
  board,
  zoom,
  onZoomChange,
  onChange,
  onPileClick,
}: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const selectedTokenIds = useProjectStore((s) => s.selectedTokenIds) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];

  const grid = board.grid ?? DEFAULT_GRID;
  const boardTokens = board.tokens ?? [];
  const bgUrl = useAssetUrl(board.background ?? null);

  const {
    containerRef,
    tokens,
    draggingIds,
    onTokenPointerDown,
    onTokenDoubleClick,
    onPointerMove,
    onPointerUp,
    onContainerPointerDown,
  } = useTokenDrag({
    boardTokens,
    grid,
    zoom,
    onChange,
    onPileClick,
  });

  useCanvasZoom(containerRef, zoom, onZoomChange);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        background: "var(--bg-app)",
        position: "relative",
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerDown={onContainerPointerDown}
    >
      <div
        style={{
          width: board.width * zoom + PADDING * 2,
          height: board.height * zoom + PADDING * 2,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <div
          data-board-bg="1"
          style={{
            position: "absolute",
            left: PADDING,
            top: PADDING,
            width: board.width,
            height: board.height,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-sm)",
            background: bgUrl ? "var(--bg-surface)" : "var(--bg-panel)",
          }}
        >
          {bgUrl && (
            <img
              src={bgUrl}
              alt=""
              data-bg="1"
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          )}

          <GridLayer grid={grid} width={board.width} height={board.height} />

          {board.show_relations && (
            <RelationLines
              board={board}
              tokens={tokens.filter((t) => t.visible)}
              relations={relations}
              relationKinds={relationKinds}
            />
          )}

          {tokens
            .filter((t) => t.visible)
            .sort((a, b) => a.layer - b.layer)
            .map((t) => {
              const card = t.card_id
                ? (cards.find((c) => c.id === t.card_id) ?? null)
                : null;
              const cardType = card
                ? (cardTypes.find((ct) => ct.id === card.type_id) ?? null)
                : null;
              return (
                <BoardToken
                  key={t.id}
                  token={t}
                  card={card}
                  cardType={cardType}
                  selected={selectedTokenIds.includes(t.id)}
                  isDragging={draggingIds.has(t.id)}
                  onPointerDown={onTokenPointerDown}
                  onDoubleClick={onTokenDoubleClick}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}
