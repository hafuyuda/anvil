import { useEffect, useRef, useState } from "react";
import type { Board, GridConfig, Token } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { CardFrame } from "../../components/CardFrame";
import { useImageUrl } from "../../hooks/useImageUrl";
import { CardBack } from "../../components/CardFrame/CardBack";
import { PileToken } from "./PileToken";

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

const DEFAULT_TOKEN_W = 140;
const DEFAULT_TOKEN_H = 205;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

interface DragState {
  primaryTokenId: string;
  // 起始时所有选中 token 的初始位置
  initialPositions: Record<string, { x: number; y: number }>;
  offsetX: number;
  offsetY: number;
  moved: boolean;
}

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
  const selectToken = useProjectStore((s) => s.selectToken);
  const toggleTokenSelection = useProjectStore((s) => s.toggleTokenSelection);
  const clearTokenSelection = useProjectStore((s) => s.clearTokenSelection);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [localTokens, setLocalTokens] = useState<Token[] | null>(null);

  const grid = board.grid ?? DEFAULT_GRID;
  const boardTokens = board.tokens ?? [];
  const bgUrl = useImageUrl(board.background ?? null);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const onZoomRef = useRef(onZoomChange);
  onZoomRef.current = onZoomChange;

  useEffect(() => {
    if (dragging || !localTokens) return;

    // 长度变化（增删）→ 立即清空
    if (boardTokens.length !== localTokens.length) {
      setLocalTokens(null);
      return;
    }

    // id 集合不一致 → 立即清空
    const boardIdSet = new Set(boardTokens.map((t) => t.id));
    const idMismatch = localTokens.some((t) => !boardIdSet.has(t.id));
    if (idMismatch) {
      setLocalTokens(null);
      return;
    }

    // id 集合一致 → 逐项比较位置 / layer / face_down
    const same = boardTokens.every((t, i) => {
      const l = localTokens[i];
      return (
        l &&
        l.id === t.id &&
        l.x === t.x &&
        l.y === t.y &&
        l.layer === t.layer &&
        (l.face_down ?? false) === (t.face_down ?? false)
      );
    });
    if (same) setLocalTokens(null);
  }, [boardTokens, dragging, localTokens]);

  const tokens = localTokens ?? boardTokens;

  // 滚轮缩放
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const container: HTMLDivElement = el;

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const z = zoomRef.current;
      const delta = -e.deltaY * 0.0015;
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * Math.exp(delta)));
      if (next === z) return;

      const rect = container.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const boardX = (container.scrollLeft + px) / z;
      const boardY = (container.scrollTop + py) / z;

      onZoomRef.current(next);

      requestAnimationFrame(() => {
        container.scrollLeft = boardX * next - px;
        container.scrollTop = boardY * next - py;
      });
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  function snap(v: number) {
    if (!grid.snap) return v;
    const s = grid.size > 0 ? grid.size : 50;
    return Math.round(v / s) * s;
  }

  function getBoardPoint(e: React.PointerEvent): {
    x: number;
    y: number;
  } | null {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left + container.scrollLeft;
    const py = e.clientY - rect.top + container.scrollTop;
    const z = zoomRef.current;
    return { x: px / z, y: py / z };
  }

  function onTokenPointerDown(e: React.PointerEvent, t: Token) {
    if (e.button !== 0) return;
    e.stopPropagation();

    const pt = getBoardPoint(e);
    if (!pt) return;

    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;

    if (isMulti) {
      toggleTokenSelection(t.id);
      return;
    }

    // 如果点在未选中的 token 上 → 单选
    if (!selectedTokenIds.includes(t.id)) {
      selectToken(t.id);
    }

    // 确定拖动集合
    const dragIds = selectedTokenIds.includes(t.id) ? selectedTokenIds : [t.id];

    const initialPositions: Record<string, { x: number; y: number }> = {};
    for (const tid of dragIds) {
      const token = boardTokens.find((x) => x.id === tid);
      if (token) initialPositions[tid] = { x: token.x, y: token.y };
    }

    setDragging({
      primaryTokenId: t.id,
      initialPositions,
      offsetX: pt.x - t.x,
      offsetY: pt.y - t.y,
      moved: false,
    });

    // 把所有选中的提到最前
    const maxLayer = boardTokens.reduce((m, x) => Math.max(m, x.layer), 0);
    const idsSet = new Set(dragIds);
    const next = boardTokens.map((x) =>
      idsSet.has(x.id) ? { ...x, layer: maxLayer + 1 } : x,
    );
    setLocalTokens(next);

    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onTokenDoubleClick(e: React.MouseEvent, t: Token) {
    e.stopPropagation();
    // 卡盒不参与翻面
    if (t.pile) return;

    const current = localTokens ?? boardTokens;
    const next = current.map((x) =>
      x.id === t.id ? { ...x, face_down: !(x.face_down ?? false) } : x,
    );
    setLocalTokens(next);
    onChange({ tokens: next });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const pt = getBoardPoint(e);
    if (!pt) return;

    const primary = dragging.initialPositions[dragging.primaryTokenId];
    if (!primary) return;

    const nx = snap(pt.x - dragging.offsetX);
    const ny = snap(pt.y - dragging.offsetY);
    const dx = nx - primary.x;
    const dy = ny - primary.y;

    const current = localTokens ?? boardTokens;
    const next = current.map((t) => {
      const init = dragging.initialPositions[t.id];
      if (init) {
        return { ...t, x: init.x + dx, y: init.y + dy };
      }
      return t;
    });
    setLocalTokens(next);
    if (!dragging.moved) setDragging({ ...dragging, moved: true });
  }

  function onPointerUp() {
    if (!dragging) return;
    const wasDragging = dragging;
    setDragging(null);
    if (wasDragging.moved && localTokens) {
      onChange({ tokens: localTokens });
      return;
    }
    // 未移动 → 检查是否卡盒，是则触发点击
    if (!wasDragging.moved && onPileClick) {
      const t = boardTokens.find((x) => x.id === wasDragging.primaryTokenId);
      if (t?.pile) {
        onPileClick(t.id);
      }
    }
  }

  function onContainerPointerDown(e: React.PointerEvent) {
    const target = e.target as HTMLElement;
    if (
      e.target === containerRef.current ||
      target.dataset.bg === "1" ||
      target.dataset.boardBg === "1"
    ) {
      clearTokenSelection();
    }
  }

  function renderToken(t: Token) {
    const w = t.w ?? DEFAULT_TOKEN_W;
    const h = t.h ?? DEFAULT_TOKEN_H;
    const scale = w / DEFAULT_TOKEN_W;
    const selected = selectedTokenIds.includes(t.id);
    const isDragging = dragging && dragging.initialPositions[t.id];
    const card = t.card_id ? cards.find((c) => c.id === t.card_id) : null;
    const cardType = card
      ? cardTypes.find((ct) => ct.id === card.type_id)
      : null;

    return (
      <div
        key={t.id}
        data-token-id={t.id}
        style={{
          position: "absolute",
          left: t.x,
          top: t.y,
          width: w,
          height: h,
          zIndex: t.layer + 1,
          cursor: isDragging ? "grabbing" : "grab",
          transition: isDragging ? "none" : "filter 0.15s, transform 0.15s",
          transform: `rotate(${t.rotation}deg)`,
          transformOrigin: "center center",
          filter: selected
            ? "drop-shadow(0 0 0 var(--accent-gold)) drop-shadow(0 4px 12px rgba(0,0,0,0.5))"
            : undefined,
          userSelect: "none",
          outline: selected ? "2px solid var(--accent-gold)" : "none",
          outlineOffset: 2,
          borderRadius: "var(--radius-md)",
        }}
        onPointerDown={(e) => onTokenPointerDown(e, t)}
        onDoubleClick={(e) => onTokenDoubleClick(e, t)}
      >
        <div
          style={{
            width: DEFAULT_TOKEN_W,
            height: DEFAULT_TOKEN_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        >
          {t.pile ? (
            <PileToken
              remaining={t.pile.remaining.length}
              total={t.pile.total}
              size="small"
            />
          ) : t.face_down === true ? (
            <CardBack path={cardType?.card_back ?? null} size="small" />
          ) : card && cardType ? (
            <CardFrame card={card} cardType={cardType} size="small" />
          ) : (
            <PlaceholderToken
              label={t.name_override ?? "Token"}
              selected={false}
            />
          )}
        </div>

        {t.name_override && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: -18,
              textAlign: "center",
              fontSize: 11,
              color: "var(--fg-secondary)",
              pointerEvents: "none",
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            {t.name_override}
          </div>
        )}
      </div>
    );
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
          stroke="var(--border-subtle)"
          strokeWidth={0.5}
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
          stroke="var(--border-subtle)"
          strokeWidth={0.5}
        />,
      );
    }
  }

  const PADDING = 16;

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

          {grid.visible && (
            <svg
              width={board.width}
              height={board.height}
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
              }}
            >
              {gridLines}
            </svg>
          )}

          {tokens
            .filter((t) => t.visible)
            .sort((a, b) => a.layer - b.layer)
            .map(renderToken)}
        </div>
      </div>
    </div>
  );
}

function PlaceholderToken({
  label,
  selected,
}: {
  label: string;
  selected: boolean;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        border: `2px solid ${
          selected ? "var(--accent-gold)" : "var(--border-default)"
        }`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: "var(--fg-secondary)",
        textAlign: "center",
        padding: 8,
      }}
    >
      {label}
    </div>
  );
}
