import { useEffect, useMemo, useRef } from "react";
import type { Board, Card, CardType, GridConfig, Token } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useAssetUrl } from "../../hooks/useAssetUrl";
import { BoardToken } from "./BoardToken";
import { RelationLines } from "./RelationLines";
import { GridLayer } from "./GridLayer";
import { useTokenDrag } from "./useTokenDrag";
import { useCanvasZoom } from "./useCanvasZoom";
import { useVisibleRect } from "./useVisibleRect";
import { tokenInView } from "./viewport";
import { BOARD_PADDING } from "./constants";

interface Props {
  board: Board;
  zoom: number;
  onZoomChange: (z: number) => void;
  onChange: (patch: Partial<Board>) => void;
  measureMode?: boolean;
  onPileClick?: (tokenId: string) => void;
  onTokenContextMenu?: (e: React.MouseEvent, t: Token) => void;
  onBoardContextMenu?: (e: React.MouseEvent) => void;
}

const DEFAULT_GRID: GridConfig = {
  size: 50,
  offset_x: 0,
  offset_y: 0,
  visible: true,
  snap: true,
};

const PADDING = BOARD_PADDING;

export function BoardCanvas({
  board,
  zoom,
  onZoomChange,
  onChange,
  measureMode,
  onPileClick,
  onTokenContextMenu,
  onBoardContextMenu,
}: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const selectedTokenIds = useProjectStore((s) => s.selectedTokenIds) ?? [];
  const selectedEdgeId = useProjectStore((s) => s.selectedEdgeId);
  const selectEdge = useProjectStore((s) => s.selectEdge);
  const relations = useProjectStore((s) => s.relations) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];

  // 建一次 Map。此前每个 token 都各自线性扫一遍 cards / cardTypes，
  // T 个 token × C 张卡，每次重渲染都是 O(T·C) —— 拖拽时每帧都在跑。
  const cardMap = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);
  const typeMap = useMemo(() => {
    const m = new Map<string, CardType>();
    for (const ct of cardTypes) m.set(ct.id, ct);
    return m;
  }, [cardTypes]);

  const grid = board.grid ?? DEFAULT_GRID;
  const boardTokens = board.tokens ?? [];
  const bgUrl = useAssetUrl(board.background ?? null);

  // ── 抽牌飞入的起飞点 ──
  // 新出现的 token 从「装着它的那个卡盒」飞出来。卡牌被抽走后 remaining 里
  // 已经没有它，但 initial 里还在 —— 所以按 initial 反查牌堆是可靠的。
  // 从卡片墙加卡、导入卡组这类没有牌堆来源的新 token 不飞，直接出现：
  // 凭空从一个编造的起点滑出来比不滑更怪。
  const prevIdsRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);
  let enterFrom: Map<string, { x: number; y: number }> | null = null;
  if (readyRef.current) {
    const prev = prevIdsRef.current;
    const added = boardTokens.filter((t) => !prev.has(t.id));
    if (added.length > 0) {
      const map = new Map<string, { x: number; y: number }>();
      for (const t of added) {
        if (!t.card_id) continue;
        const src = boardTokens.find(
          (p) => p.pile && p.pile.initial.includes(t.card_id!),
        );
        if (src) map.set(t.id, { x: src.x, y: src.y });
      }
      if (map.size > 0) enterFrom = map;
    }
  }
  useEffect(() => {
    prevIdsRef.current = new Set(boardTokens.map((t) => t.id));
    readyRef.current = true;
  }, [boardTokens]);

  const {
    containerRef,
    tokens,
    draggingIds,
    dragPreview,
    marquee,
    measureLine,
    spaceHeld,
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
    measureMode,
  });

  useCanvasZoom(containerRef, zoom, onZoomChange);

  // ── DOM 虚拟化 ──
  // 只挂载视口内的 token：每枚 token 是一棵完整的 CardFrame 子树，
  // 几百枚全挂在一起时拖拽每帧都要扛着整片林子。视口外的不进 DOM，
  // 滚动到位再挂——与卡片墙「首屏限额 + 加载更多」同源的思路。
  const visibleRect = useVisibleRect(containerRef, zoom);
  const renderTokens = useMemo(() => {
    const base = tokens.filter((t) => t.visible);
    const kept = visibleRect
      ? base.filter((t) => draggingIds.has(t.id) || tokenInView(t, visibleRect))
      : base;
    return kept.sort((a, b) => a.layer - b.layer);
  }, [tokens, visibleRect, draggingIds]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        background: "var(--bg-app)",
        position: "relative",
        cursor: spaceHeld ? "grab" : undefined,
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerDown={onContainerPointerDown}
      onContextMenu={onBoardContextMenu}
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

          {/* 拖拽落点预览：画在 token 之下，松手前就看见会落到哪一格 */}
          {dragPreview && (
            <div
              data-drag-preview="1"
              style={{
                position: "absolute",
                left: dragPreview.x,
                top: dragPreview.y,
                width: dragPreview.w,
                height: dragPreview.h,
                border: "2px dashed var(--accent-gold)",
                borderRadius: "var(--radius-md)",
                background: "color-mix(in srgb, var(--accent-gold) 10%, transparent)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}

          {/* 关系线仍用全量表：线要连到视口外的 token，
              锚点在不在屏里不影响这条边存不存在。 */}
          {board.show_relations && (
            <RelationLines
              board={board}
              tokens={tokens.filter((t) => t.visible)}
              relations={relations}
              relationKinds={relationKinds}
              selectedEdgeId={selectedEdgeId}
              onSelectEdge={selectEdge}
            />
          )}

          {renderTokens.map((t) => {
              const card = t.card_id ? (cardMap.get(t.card_id) ?? null) : null;
              const cardType = card ? (typeMap.get(card.type_id) ?? null) : null;
              return (
                <BoardToken
                  key={t.id}
                  token={t}
                  card={card}
                  cardType={cardType}
                  selected={selectedTokenIds.includes(t.id)}
                  isDragging={draggingIds.has(t.id)}
                  enterFrom={enterFrom?.get(t.id) ?? null}
                  onPointerDown={onTokenPointerDown}
                  onDoubleClick={onTokenDoubleClick}
                  onContextMenu={onTokenContextMenu}
                />
              );
            })}

          {/* 框选矩形：与 token 同坐标系（board-bg 内，已缩放） */}
          {marquee && (marquee.x1 !== marquee.x2 || marquee.y1 !== marquee.y2) && (
            <div
              style={{
                position: "absolute",
                left: Math.min(marquee.x1, marquee.x2),
                top: Math.min(marquee.y1, marquee.y2),
                width: Math.abs(marquee.x2 - marquee.x1),
                height: Math.abs(marquee.y2 - marquee.y1),
                border: "1px solid var(--accent-gold)",
                background: "color-mix(in srgb, var(--accent-gold) 12%, transparent)",
                pointerEvents: "none",
                zIndex: 5,
              }}
            />
          )}

          {/* 测量线 + 距离标注 */}
          {measureLine && (
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: board.width,
                height: board.height,
                pointerEvents: "none",
                zIndex: 6,
                overflow: "visible",
              }}
            >
              <line
                x1={measureLine.x1}
                y1={measureLine.y1}
                x2={measureLine.x2}
                y2={measureLine.y2}
                stroke="var(--accent-ember)"
                strokeWidth={1.5}
              />
              <circle cx={measureLine.x1} cy={measureLine.y1} r={3} fill="var(--accent-ember)" />
              <circle cx={measureLine.x2} cy={measureLine.y2} r={3} fill="var(--accent-ember)" />
              <MeasureLabel
                line={measureLine}
                gridSize={grid.size > 0 ? grid.size : 50}
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function MeasureLabel({
  line,
  gridSize,
}: {
  line: { x1: number; y1: number; x2: number; y2: number };
  gridSize: number;
}) {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const px = Math.sqrt(dx * dx + dy * dy);
  const cells = px / gridSize;
  const mx = (line.x1 + line.x2) / 2;
  const my = (line.y1 + line.y2) / 2;
  const label = `${cells.toFixed(1)} 格 · ${Math.round(px)} px`;
  return (
    <g>
      <rect
        x={mx - label.length * 3.6 - 4}
        y={my - 18}
        width={label.length * 7.2 + 8}
        height={16}
        rx={3}
        fill="var(--bg-panel)"
        stroke="var(--accent-ember)"
        strokeWidth={0.5}
      />
      <text
        x={mx}
        y={my - 6}
        textAnchor="middle"
        fontSize={11}
        fill="var(--fg-primary)"
        fontFamily="var(--font-mono)"
      >
        {label}
      </text>
    </g>
  );
}
