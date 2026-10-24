import { useEffect, useMemo, useRef, useState } from "react";
import type { Board, GridConfig, Token } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { isModified } from "../../lib/keyboard";
import {
  BOARD_PADDING,
  DEFAULT_TOKEN_H,
  DEFAULT_TOKEN_W,
} from "./constants";

interface DragState {
  primaryTokenId: string;
  initialPositions: Record<string, { x: number; y: number }>;
  offsetX: number;
  offsetY: number;
  moved: boolean;
}

/** 框选 / 测量的矩形（棋盘坐标）。 */
export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * 拖拽时的落点预览：主 token 吸附后的所占格外框。
 * 棋盘在 token 底下画一个虚线框，让「会落到哪一格」在松手前就可见。
 */
export interface DragPreview {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Gesture =
  | { kind: "pan"; sx: number; sy: number; sl: number; st: number; moved: boolean }
  | { kind: "marquee"; moved: boolean }
  | { kind: "measure"; moved: boolean }
  | null;

interface Options {
  boardTokens: Token[];
  grid: GridConfig;
  zoom: number;
  onChange: (patch: Partial<Board>) => void;
  onPileClick?: (tokenId: string) => void;
  /** 测量模式：在空白处拖拽绘制距离测量线，而非框选。 */
  measureMode?: boolean;
}

/**
 * 棋盘 token 的指针交互统一入口：
 * - 拖拽移动 / 多选 / 双击翻牌（原有）
 * - 空白处左键拖拽 = 框选（新增）
 * - 测量模式下空白处拖拽 = 距离测量（新增）
 * - 空格按住 或 中键拖拽 = 平移画布（新增；平移走容器 scroll）
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
  measureMode,
}: Options) {
  const selectedTokenIds = useProjectStore((s) => s.selectedTokenIds) ?? [];
  const selectToken = useProjectStore((s) => s.selectToken);
  const toggleTokenSelection = useProjectStore((s) => s.toggleTokenSelection);
  const clearTokenSelection = useProjectStore((s) => s.clearTokenSelection);
  const clearEdgeSelection = useProjectStore((s) => s.clearEdgeSelection);
  const setTokenSelection = useProjectStore((s) => s.setTokenSelection);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [localTokens, setLocalTokens] = useState<Token[] | null>(null);

  const [marquee, setMarquee] = useState<Rect | null>(null);
  const marqueeRef = useRef<Rect | null>(null);
  const [measureLine, setMeasureLine] = useState<Rect | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const spaceRef = useRef(false);
  const gesture = useRef<Gesture>(null);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // 空格按住 = 进入平移预备态（光标变 grab，左键拖拽即平移）
  useEffect(() => {
    function isEditable(el: EventTarget | null): boolean {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || node.isContentEditable;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !isEditable(e.target)) {
        if (!spaceRef.current) {
          spaceRef.current = true;
          setSpaceHeld(true);
        }
        e.preventDefault();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        spaceRef.current = false;
        setSpaceHeld(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

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

  function snap(v: number, offset: number) {
    if (!grid.snap) return v;
    const s = grid.size > 0 ? grid.size : 50;
    const o = (((offset % s) + s) % s) || 0;
    return Math.round((v - o) / s) * s + o;
  }

  /**
   * 屏幕坐标 → 棋盘坐标。
   * 容器滚动 + 内边距(PADDING) + 缩放三者都要抵消。
   */
  function getBoardPoint(e: React.PointerEvent): {
    x: number;
    y: number;
  } | null {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left + container.scrollLeft - BOARD_PADDING;
    const py = e.clientY - rect.top + container.scrollTop - BOARD_PADDING;
    const z = zoomRef.current;
    return { x: px / z, y: py / z };
  }

  function tokenIntersects(t: Token, r: Rect): boolean {
    const minX = Math.min(r.x1, r.x2);
    const maxX = Math.max(r.x1, r.x2);
    const minY = Math.min(r.y1, r.y2);
    const maxY = Math.max(r.y1, r.y2);
    const tw = t.w ?? DEFAULT_TOKEN_W;
    const th = t.h ?? DEFAULT_TOKEN_H;
    return (
      t.x < maxX && t.x + tw > minX && t.y < maxY && t.y + th > minY
    );
  }

  function onTokenPointerDown(e: React.PointerEvent, t: Token) {
    if (e.button !== 0) return;
    e.stopPropagation();

    const pt = getBoardPoint(e);
    if (!pt) return;

    const isMulti = isModified(e) || e.shiftKey;

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
    if (dragging) {
      const pt = getBoardPoint(e);
      if (!pt) return;

      const primary = dragging.initialPositions[dragging.primaryTokenId];
      if (!primary) return;

      const nx = snap(pt.x - dragging.offsetX, grid.offset_x);
      const ny = snap(pt.y - dragging.offsetY, grid.offset_y);
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
      return;
    }

    const g = gesture.current;
    if (!g) return;

    if (g.kind === "pan") {
      const container = containerRef.current;
      if (container) {
        container.scrollLeft = g.sl - (e.clientX - g.sx);
        container.scrollTop = g.st - (e.clientY - g.sy);
      }
      if (!g.moved && (Math.abs(e.clientX - g.sx) > 2 || Math.abs(e.clientY - g.sy) > 2)) {
        g.moved = true;
        if (container) container.style.cursor = "grabbing";
      }
      return;
    }

    const pt = getBoardPoint(e);
    if (!pt) return;

    if (g.kind === "measure") {
      g.moved = true;
      setMeasureLine((m) => (m ? { ...m, x2: pt.x, y2: pt.y } : m));
      return;
    }

    if (g.kind === "marquee") {
      g.moved = true;
      const next = marqueeRef.current
        ? { ...marqueeRef.current, x2: pt.x, y2: pt.y }
        : null;
      marqueeRef.current = next;
      setMarquee(next);
      return;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (dragging) {
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
      return;
    }

    const g = gesture.current;
    gesture.current = null;
    const container = containerRef.current;
    if (container) container.style.cursor = "";

    if (!g) return;

    if (g.kind === "pan") return;

    if (g.kind === "measure") return; // 测量线保留，直到下一次测量

    if (g.kind === "marquee") {
      const r = marqueeRef.current;
      if (g.moved && r) {
        const ids = tokens.filter((t) => tokenIntersects(t, r)).map((t) => t.id);
        if (e.shiftKey) {
          const merged = new Set([...selectedTokenIds, ...ids]);
          setTokenSelection([...merged]);
        } else {
          setTokenSelection(ids);
        }
      } else {
        // 空白处单击：清空选区（保留原行为）
        clearTokenSelection();
        clearEdgeSelection();
      }
      marqueeRef.current = null;
      setMarquee(null);
      return;
    }
  }

  function onContainerPointerDown(e: React.PointerEvent) {
    const container = containerRef.current;
    if (!container) return;

    // 平移：中键，或空格按住 + 左键
    if (e.button === 1 || (e.button === 0 && spaceRef.current)) {
      e.preventDefault();
      gesture.current = {
        kind: "pan",
        sx: e.clientX,
        sy: e.clientY,
        sl: container.scrollLeft,
        st: container.scrollTop,
        moved: false,
      };
      container.style.cursor = "grabbing";
      container.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) return;

    // 测量模式：绘制距离线
    if (measureMode) {
      const pt = getBoardPoint(e);
      if (!pt) return;
      gesture.current = { kind: "measure", moved: false };
      setMeasureLine({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
      container.setPointerCapture(e.pointerId);
      return;
    }

    // 框选：记录起点，移动后才成为框选，否则是单击清空
    const pt = getBoardPoint(e);
    if (!pt) return;
    gesture.current = { kind: "marquee", moved: false };
    const rect: Rect = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
    marqueeRef.current = rect;
    setMarquee(rect);
    container.setPointerCapture(e.pointerId);
  }

  const draggingIds = useMemo(
    () => new Set(dragging ? Object.keys(dragging.initialPositions) : []),
    [dragging],
  );

  /**
   * 落点预览。只在开吸附时给 —— 不吸附就没有「对齐到某一格」可预览，
   * 画个框反而只是噪音。
   */
  const dragPreview = useMemo<DragPreview | null>(() => {
    if (!dragging || !grid.snap) return null;
    const t = tokens.find((x) => x.id === dragging.primaryTokenId);
    if (!t) return null;
    return {
      x: t.x,
      y: t.y,
      w: t.w ?? DEFAULT_TOKEN_W,
      h: t.h ?? DEFAULT_TOKEN_H,
    };
  }, [dragging, grid.snap, tokens]);

  return {
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
  };
}
