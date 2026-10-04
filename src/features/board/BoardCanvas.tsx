import { useEffect, useRef, useState } from "react";
import type { Board, GridConfig, Token } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";

interface Props {
  board: Board;
  onChange: (patch: Partial<Board>) => void;
}

const DEFAULT_GRID: GridConfig = {
  size: 50,
  offset_x: 0,
  offset_y: 0,
  visible: true,
  snap: true,
};

export function BoardCanvas({ board, onChange }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const selectedTokenId = useProjectStore((s) => s.selectedTokenId);
  const selectToken = useProjectStore((s) => s.selectToken);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<{
    tokenId: string;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);
  const [localTokens, setLocalTokens] = useState<Token[] | null>(null);

  const grid = board.grid ?? DEFAULT_GRID;
  const boardTokens = board.tokens ?? [];

  // 外部 board.tokens 变化时同步（比如检查器改了 token）
  useEffect(() => {
    if (dragging || !localTokens) return;
    const same =
      board.tokens.length === localTokens.length &&
      board.tokens.every((t, i) => {
        const l = localTokens[i];
        return l && l.id === t.id && l.x === t.x && l.y === t.y;
      });
    if (same) {
      setLocalTokens(null);
    }
  }, [board.tokens, dragging, localTokens]);

  const tokens = localTokens ?? boardTokens;

  function snap(v: number) {
    if (!grid.snap) return v;
    const s = grid.size > 0 ? grid.size : 50;
    return Math.round(v / s) * s;
  }

  function onTokenPointerDown(e: React.PointerEvent, t: Token) {
    e.stopPropagation();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragging({
      tokenId: t.id,
      offsetX: x - t.x,
      offsetY: y - t.y,
      moved: false,
    });
    selectToken(t.id);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - dragging.offsetX;
    const y = e.clientY - rect.top - dragging.offsetY;
    const next = boardTokens.map((t) =>
      t.id === dragging.tokenId ? { ...t, x: snap(x), y: snap(y) } : t,
    );
    setLocalTokens(next);
    if (!dragging.moved) {
      setDragging({ ...dragging, moved: true });
    }
  }

  function onPointerUp() {
    if (!dragging) return;
    const wasDragging = dragging;
    setDragging(null);
    if (wasDragging.moved && localTokens) {
      onChange({ tokens: localTokens });
    }
  }

  function onSvgPointerDown(e: React.PointerEvent) {
    // 点击空白区域取消选中
    if (e.target === svgRef.current) {
      selectToken(null);
    }
  }

  function cardColor(cardId?: string | null) {
    if (!cardId) return "#888888";
    const card = cards.find((c) => c.id === cardId);
    if (!card) return "#888888";
    const t = cardTypes.find((x) => x.id === card.type_id);
    return t?.color ?? "#888888";
  }

  function tokenLabel(t: Token) {
    if (t.name_override) return t.name_override;
    const card = cards.find((c) => c.id === t.card_id);
    return card?.name ?? "Token";
  }

  const gridLines: React.ReactNode[] = [];
  if (grid.visible && grid.size > 0) {
    const step = grid.size;
    for (let x = 0; x <= board.width; x += step) {
      gridLines.push(
        <line
          key={`vx${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={board.height}
          stroke="#eeeeee"
        />,
      );
    }
    for (let y = 0; y <= board.height; y += step) {
      gridLines.push(
        <line
          key={`hy${y}`}
          x1={0}
          y1={y}
          x2={board.width}
          y2={y}
          stroke="#eeeeee"
        />,
      );
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        background: "#f0f0f0",
      }}
    >
      <svg
        ref={svgRef}
        width={board.width}
        height={board.height}
        style={{ display: "block", background: "#fff", margin: 16 }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerDown={onSvgPointerDown}
      >
        {gridLines}
        {tokens
          .filter((t) => t.visible)
          .sort((a, b) => a.layer - b.layer)
          .map((t) => {
            const color = cardColor(t.card_id);
            const w = t.w ?? 80;
            const h = t.h ?? 80;
            const selected = selectedTokenId === t.id;
            return (
              <g
                key={t.id}
                transform={`translate(${t.x},${t.y})`}
                style={{
                  cursor: dragging?.tokenId === t.id ? "grabbing" : "grab",
                }}
                onPointerDown={(e) => onTokenPointerDown(e, t)}
              >
                <circle
                  cx={w / 2}
                  cy={h / 2}
                  r={Math.min(w, h) / 2}
                  fill={`${color}33`}
                  stroke={selected ? "#333" : color}
                  strokeWidth={selected ? 3 : 2}
                />
                <text
                  x={w / 2}
                  y={h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill="#222"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {tokenLabel(t)}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );
}
