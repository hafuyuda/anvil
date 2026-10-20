import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  Card,
  CardType,
  GameEvent,
  SessionViewMode,
} from "../../../core/ipc";
import { isEventVisible } from "../../../core/ipc";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { ChatMessage } from "./ChatMessage";

/** 首屏渲染多少条。再多就只渲染尾部这些，上面挂「加载更早」。 */
const RENDER_LIMIT = 300;
/** 每次点「加载更早」多渲染多少条。 */
const LOAD_STEP = 300;
/** 距底部多少像素内才认为是「停在底部」，新消息到时自动滚下去。 */
const BOTTOM_SLACK = 60;

interface Props {
  events: GameEvent[];
  cards: Card[];
  cardTypes: CardType[];
  view: SessionViewMode;
  filter?: "all" | "chat";
  onEdit?: (event: GameEvent) => void;
  onDelete?: (event: GameEvent) => void;
  onReveal?: (event: GameEvent) => void;
}

export function ChatLog({
  events,
  cards,
  cardTypes,
  view,
  filter = "all",
  onEdit,
  onDelete,
  onReveal,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  // 卡表建一次 Map。此前每条消息都各自线性扫一遍 cards 找作者卡，
  // N 条消息 × M 张卡，每次重渲染都是 O(N·M)。
  const cardMap = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);
  const typeMap = useMemo(() => {
    const m = new Map<string, CardType>();
    for (const t of cardTypes) m.set(t.id, t);
    return m;
  }, [cardTypes]);

  // 可见集（玩家视图滤掉秘密消息 —— 这就是帷幕本身）
  //
  // gm 全景 + 全类别时过滤是恒等映射，直接复用 events 引用：
  // 否则每条新消息都把整个数组过滤一遍，长会话里又变成 O(n²)。
  const passthrough = view === "gm" && filter !== "chat";
  const visible = useMemo(
    () =>
      passthrough
        ? events
        : events.filter((e) => {
            if (filter === "chat" && !e.kind.startsWith("chat.")) return false;
            return isEventVisible(e, view);
          }),
    [passthrough, events, filter, view],
  );

  // 会话切换后回到默认限额。用首条 seq 当身份：整表被换掉时它必然变。
  const firstSeq = events.length > 0 ? events[0].seq : null;
  const [lastFirstSeq, setLastFirstSeq] = useState(firstSeq);
  const [visibleCount, setVisibleCount] = useState(RENDER_LIMIT);
  if (firstSeq !== lastFirstSeq) {
    setLastFirstSeq(firstSeq);
    setVisibleCount(RENDER_LIMIT);
  }

  const earlierCount = Math.max(0, visible.length - visibleCount);
  const shown = earlierCount > 0 ? visible.slice(earlierCount) : visible;
  const hiddenCount = events.length - visible.length;

  // ── 滚到底部 ──
  // 只有本来就停在底部才跟着滚，否则用户正翻历史时会被新消息拽走。
  // 要求减少动效时用瞬间滚动 —— smooth 在这种偏好下是纯干扰。
  const stickToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SLACK;
  }, []);

  const nearBottomRef = useRef(true);
  const handleScroll = useCallback(() => {
    nearBottomRef.current = stickToBottom();
  }, [stickToBottom]);

  useEffect(() => {
    if (nearBottomRef.current) {
      bottomRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
  }, [shown.length, reducedMotion]);

  // ── 「加载更早」的锚点 ──
  // 新内容插在上面，直接改 scrollTop 会让视口跳走。
  // 记下插入前的高度，提交后把差值补回 scrollTop。
  const anchorRef = useRef<{ height: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const anchor = anchorRef.current;
    if (!el || !anchor) return;
    anchorRef.current = null;
    el.scrollTop = anchor.top + (el.scrollHeight - anchor.height);
  }, [visibleCount]);

  function loadMore() {
    const el = scrollRef.current;
    anchorRef.current = {
      height: el?.scrollHeight ?? 0,
      top: el?.scrollTop ?? 0,
    };
    setVisibleCount((n) => Math.min(visible.length, n + LOAD_STEP));
  }

  const handleEdit = useCallback(
    (e: GameEvent) => onEdit?.(e),
    [onEdit],
  );
  const handleDelete = useCallback(
    (e: GameEvent) => onDelete?.(e),
    [onDelete],
  );
  const handleReveal = useCallback(
    (e: GameEvent) => onReveal?.(e),
    [onReveal],
  );

  if (shown.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          color: "var(--fg-muted)",
          fontSize: 12,
          background: "var(--chat-panel-bg)",
        }}
      >
        <span>还没有消息，下面输入框开始吧</span>
        {hiddenCount > 0 && (
          <span style={{ fontSize: 11, opacity: 0.7 }}>
            （已隐藏 {hiddenCount} 条秘密消息）
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: "8px 12px",
        background: "var(--chat-panel-bg)",
      }}
    >
      {hiddenCount > 0 && (
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            textAlign: "center",
            padding: "2px 0 8px",
            borderBottom: "1px dashed var(--border-subtle)",
            marginBottom: 8,
          }}
        >
          已隐藏 {hiddenCount} 条秘密消息
        </div>
      )}

      {earlierCount > 0 && (
        <button
          className="btn btn-ghost"
          onClick={loadMore}
          style={{
            display: "block",
            margin: "0 auto 10px",
            fontSize: 11,
            color: "var(--fg-secondary)",
          }}
        >
          加载更早的 {Math.min(LOAD_STEP, earlierCount)} 条（还有 {earlierCount} 条）
        </button>
      )}

      {shown.map((e) => (
        <ChatMessage
          key={e.seq}
          event={e}
          cardMap={cardMap}
          typeMap={typeMap}
          view={view}
          onEdit={onEdit ? handleEdit : undefined}
          onDelete={onDelete ? handleDelete : undefined}
          onReveal={onReveal ? handleReveal : undefined}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
