import { useEffect, useRef, useState } from "react";
import type { Board, GridConfig, Token } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";

interface DragState {
  primaryTokenId: string;
  initialPositions: Record<string, { x: number; y: number }>;
  offsetX: number;
  offsetY: number;
  moved: boolean;
}

interface Options {
  boardTokens: Token[];
  grid: GridConfig;
  zoom: number;
  onChange: (patch: Partial<Board>) => void;
  onPileClick?: (tokenId: string) => void;
}

/**
 * 棋盘 token 的拖拽 / 多选 / 双击翻牌。
 *
 * 拖拽时用 localTokens 作为本地镜像（高频操作不过 IPC），
 * 松手后再写回 store。同步 effect 必须先比较长度和 id 集合，
 * 再逐项比字段，避免拖动后删除 token 时界面延迟一拍。
 */
export function useTokenDrag({
  boardTokens,
  grid,
  zoom,
  onChange,
  onPileClick,
}: Options) {
  const selectedTokenIds = useProjectStore((s) => s.selectedTokenIds) ?? [];
  const selectToken = useProjectStore((s) => s.selectToken);
  const toggleTokenSelection = useProjectStore((s) => s.toggleTokenSelection);
  const clearTokenSelection = useProjectStore((s) => s.clearTokenSelection);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [localTokens, setLocalTokens] = useState<Token[] | null>(null);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // 本地镜像与 store 同步
  useEffect(() => {
    if (dragging || !localTokens) return;

    if (boardTokens.length !== localTokens.length) {
      setLocalTokens(null);
      return;
    }

    const boardIdSet = new Set(boardTokens.map((t) => t.id));
    const idMismatch = localTokens.some((t) => !boardIdSet.has(t.id));
    if (idMismatch) {
      setLocalTokens(null);
      return;
    }

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

    let dragIds: string[];

    if (isMulti) {
      const wasSelected = selectedTokenIds.includes(t.id);
      toggleTokenSelection(t.id);
      if (wasSelected) {
        // Ctrl+点已选中 → 取消选中，不进入拖拽
        return;
      }
      // 加选：拖拽集合 = 原选中 + 当前（state 异步，手动并集）
      dragIds = [...selectedTokenIds, t.id];
    } else {
      if (!selectedTokenIds.includes(t.id)) {
        selectToken(t.id);
        dragIds = [t.id];
      } else {
        dragIds = selectedTokenIds;
      }
    }

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

  const draggingIds = new Set(
    dragging ? Object.keys(dragging.initialPositions) : [],
  );

  return {
    containerRef,
    tokens,
    draggingIds,
    onTokenPointerDown,
    onTokenDoubleClick,
    onPointerMove,
    onPointerUp,
    onContainerPointerDown,
  };
}
