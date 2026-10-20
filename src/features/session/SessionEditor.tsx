import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  ipc,
  type Board,
  type Card,
  type ChatEventKind,
  type ChatPayload,
  type EventVisibility,
  type GameEvent,
  type GridConfig,
  type InitiativeEntry,
  type InitiativeTracker,
  type Session,
  type SessionViewMode,
  type Token,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { DEFAULT_GRID } from "../board/constants";
import { usePileActions } from "../board/usePileActions";
import { PileDrawDialog } from "../board/PileDrawDialog";
import { nowMs } from "../../lib/time";
import { newId, makeUndoId } from "../../lib/id";
import { mergeEntity } from "../../lib/undoMerge";
import { toast } from "../../lib/toast";
import { confirmDialog } from "../../lib/confirm";
import { runWithError } from "../../lib/runWithError";
import { SessionTopBar } from "./SessionTopBar";
import { SessionStage } from "./SessionStage";
import { ChatPanel } from "./ChatPanel";
import { InitiativeBar } from "./InitiativeBar";
import { InitiativeDialog } from "./InitiativeDialog";
import { BoardReplay } from "./BoardReplay";
import { EventEditorDialog } from "./EventEditorDialog";
import { useSessionEvents } from "./useSessionEvents";
import { getRuleSet, type RuleSetId } from "./ruleset";
import type { CardStat } from "./cardStats";
import { RollDialog } from "./chat/RollDialog";
import type { RollInfo } from "../../core/ipc";
import {
  BOARD_STEP_KIND,
  diffSnapshots,
  drawStep,
  isEmptyStep,
  pileStep,
  toSnapshots,
} from "./boardRecord";
import type { PileAction } from "../board/usePileActions";

interface Props {
  session: Session;
}

export function SessionEditor({ session }: Props) {
  const boards = useProjectStore((s) => s.boards) ?? [];
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const upsertSession = useProjectStore((s) => s.upsertSession);
  const setCurrentSession = useProjectStore((s) => s.setCurrentSession);
  const pushUndo = useProjectStore((s) => s.pushUndo);
  const updateCard = useProjectStore((s) => s.updateCard);

  const selectedTokenId = useProjectStore((s) => s.selectedTokenId);
  const selectToken = useProjectStore((s) => s.selectToken);

  const [zoom, setZoom] = useState(1);
  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);
  const [pileDrawTokenId, setPileDrawTokenId] = useState<string | null>(null);
  const [replayOpen, setReplayOpen] = useState(false);

  // ── 帷幕 ──
  const [view, setView] = useState<SessionViewMode>("gm");
  const [initiativeOpen, setInitiativeOpen] = useState(false);
  const [quickCheck, setQuickCheck] = useState<{
    stat: CardStat;
    card: Card;
  } | null>(null);

  // ── 跑团三栏分隔（自研，零依赖；水平 flex + 拖拽改 flex-basis）──
  // 沙箱无法访问 npm registry，故不引入 react-resizable-panels，自研一个
  // 更轻的分隔器：即时跟手、localStorage 持久化、聊天可折叠，且天然无过渡，
  // 与「动效只走合成属性 / 尊重 reduced-motion」原则一致。
  const SESSION_LAYOUT_KEY = "anvil-session-layout";
  const [chatPct, setChatPct] = useState<number>(() => {
    const saved = Number(localStorage.getItem(SESSION_LAYOUT_KEY));
    return saved >= 15 && saved <= 50 ? saved : 24;
  });
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const pctRef = useRef(chatPct);
  pctRef.current = chatPct;

  const onDragMove = useCallback((e: MouseEvent) => {
    const el = splitRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    let pct = ((e.clientX - rect.left) / rect.width) * 100;
    pct = Math.max(15, Math.min(50, pct));
    setChatPct(pct);
  }, []);

  const stopDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", stopDrag);
    try {
      localStorage.setItem(SESSION_LAYOUT_KEY, String(pctRef.current));
    } catch {
      /* localStorage 不可用时静默 */
    }
  }, [onDragMove]);

  const startDrag = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      setDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onDragMove);
      window.addEventListener("mouseup", stopDrag);
    },
    [onDragMove, stopDrag],
  );

  const sessionRef = useRef(session);
  sessionRef.current = session;
  // 棋盘最近一次已知布局。拖动时 props 还没回灌，diff 以它为准，不拿滞后的 session。
  const boardTokensRef = useRef<Token[]>(session.tokens);

  const { events, logEvent, updateEvent, deleteEvent, revealEvent } =
    useSessionEvents(session.id);

  const ruleSet = (session.rule_set ?? "generic") as RuleSetId;

  const board = session.board_id
    ? (boards.find((b) => b.id === session.board_id) ?? null)
    : null;

  const grid: GridConfig = board?.grid ?? DEFAULT_GRID;
  const width = board?.width ?? 1200;
  const height = board?.height ?? 800;

  const effectiveBoard: Board = {
    id: session.id,
    name: session.name,
    width,
    height,
    grid,
    background: board?.background ?? null,
    tokens: session.tokens,
    created_at: session.created_at,
    updated_at: session.updated_at,
  };

  // 切换会话时重置视图状态
  useEffect(() => {
    setZoom(1);
    setView("gm");
  }, [session.id]);

  // Ctrl+G 切换帷幕 —— 这是整个模块的核心开关
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() !== "g") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      e.preventDefault();
      setView((v) => (v === "gm" ? "player" : "gm"));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 撤销 / 切棋盘等外部改动后，把棋盘基准拉回与会话一致
  useEffect(() => {
    boardTokensRef.current = session.tokens;
  }, [session.tokens]);

  // 登记当前会话（供检查器使用）
  useEffect(() => {
    setCurrentSession(session.id);
    return () => {
      setCurrentSession(null);
    };
  }, [session.id, setCurrentSession]);

  // 参与角色（KP 永远在第一位）
  const authors = useMemo(() => {
    const out: { card_id: string | null; name: string }[] = [
      { card_id: null, name: "KP" },
    ];
    const seen = new Set<string>();
    for (const t of session.tokens) {
      if (!t.card_id || seen.has(t.card_id)) continue;
      seen.add(t.card_id);
      const c = cards.find((x) => x.id === t.card_id);
      if (c) out.push({ card_id: c.id, name: c.name });
    }
    return out;
  }, [session.tokens, cards]);

  // 先攻候选者：棋盘上有卡的角色。PC / NPC 由 KP 在对话框里判定。
  const initiativeCandidates = useMemo(() => {
    const seen = new Set<string>();
    const out: {
      tokenId: string;
      cardId: string;
      name: string;
      isPc: boolean;
    }[] = [];
    for (const t of session.tokens) {
      if (!t.card_id || seen.has(t.card_id)) continue;
      const c = cards.find((x) => x.id === t.card_id);
      if (!c) continue;
      seen.add(t.card_id);
      out.push({
        tokenId: t.id,
        cardId: c.id,
        name: c.name,
        isPc: false,
      });
    }
    return out;
  }, [session.tokens, cards]);

  async function persist(next: Session) {
    upsertSession(next);
    await runWithError(() => ipc.upsertSession(next), "保存失败");
  }

  /** 撤销 / 重做时从 store 读当前会话，不用渲染时捕获的旧对象。 */
  function currentSession(): Session | null {
    return (
      useProjectStore.getState().sessions.find((s) => s.id === session.id) ?? null
    );
  }

  const { drawFromPile, shufflePile, resetPile } = usePileActions({
    tokens: session.tokens,
    applyTokens: (next, label, action) => handlePileApply(next, label, action),
    bounds: { width: effectiveBoard.width, height: effectiveBoard.height },
  });

  async function savePatch(patch: Partial<Session>, undoLabel?: string) {
    const before = sessionRef.current;
    const after: Session = {
      ...before,
      ...patch,
      updated_at: nowMs(),
    };
    await persist(after);
    if (undoLabel) {
      pushUndo({
        id: makeUndoId(),
        label: undoLabel,
        undo: async () => {
          // 只回滚本次改过的字段；用户在此期间的编辑（拖动别的 token、
          // 推进轮次）按 id / 按键合并保留
          const cur = currentSession();
          await persist(cur ? mergeEntity(before, after, cur) : before);
        },
        redo: async () => {
          const cur = currentSession();
          await persist(cur ? mergeEntity(after, before, cur) : after);
        },
      });
    }
  }

  // ── 牌谱 ──
  // 棋盘动作先入事件流再落盘。拖拽天然是一次 onChange 一步，所以不需要节流。

  async function handlePileApply(
    next: Token[],
    label: string,
    action?: PileAction,
  ) {
    const before = toSnapshots(boardTokensRef.current, cards);
    const after = toSnapshots(next, cards);
    boardTokensRef.current = next;
    await savePatch({ tokens: next }, label);
    if (!action) return;
    const step =
      action.kind === "draw"
        ? drawStep(before, after, action.pile_token_id)
        : pileStep(after, action.pile_token_id, action.kind);
    if (isEmptyStep(step)) return;
    await logEvent(BOARD_STEP_KIND, step);
  }

  // ── 先攻追踪 ──
  // 轮次推进是高频操作，不进撤销栈，否则撤销历史会被噪音淹没

  function currentTracker(): InitiativeTracker {
    return (
      session.tracker ?? {
        round: 1,
        turn_index: 0,
        active: false,
        entries: [],
      }
    );
  }

  async function handleSelectBoard(boardId: string) {
    if (!boardId) {
      await savePatch({ board_id: null, tokens: [] });
      return;
    }
    if (session.tokens.length > 0) {
      const ok = await confirmDialog({
        message: "切换棋盘会清空本会话的 Token，继续？",
        confirmLabel: "切换",
        danger: true,
      });
      if (!ok) return;
    }
    const b = boards.find((x) => x.id === boardId);
    if (!b) return;
    const cloned: Token[] = (b.tokens ?? []).map((t) => ({
      ...t,
      id: newId(),
    }));
    await savePatch({ board_id: b.id, tokens: cloned });
    boardTokensRef.current = cloned;
    // 快照是整局牌谱的起点，缺了它无从回放
    await logEvent("session.start", {
      board_id: b.id,
      tokens: toSnapshots(cloned, cards),
    });
  }

  async function handleTokensChange(tokens: Token[]) {
    const before = toSnapshots(boardTokensRef.current, cards);
    const after = toSnapshots(tokens, cards);
    boardTokensRef.current = tokens;
    await savePatch({ tokens });
    const step = diffSnapshots(before, after);
    if (isEmptyStep(step)) return;
    await logEvent(BOARD_STEP_KIND, step);
  }

  // 旧会话没有快照。用当前布局补一个起点，牌谱从这里往后记。
  async function handleSeedSnapshot() {
    await logEvent("session.start", {
      board_id: session.board_id ?? null,
      tokens: toSnapshots(session.tokens, cards),
    });
    toast.success("已以当前棋盘建立牌谱起点");
  }

  async function handleInitiativeApply(entries: InitiativeEntry[]) {
    if (entries.length === 0) return;
    await savePatch({
      tracker: { round: 1, turn_index: 0, active: true, entries },
    });
    await logEvent("combat.round", {
      round: 1,
      order: entries.map((e) => e.name),
    });
    setInitiativeOpen(false);
  }

  async function handleNext() {
    const t = currentTracker();
    if (t.entries.length === 0) return;
    let idx = t.turn_index + 1;
    let round = t.round;
    if (idx >= t.entries.length) {
      idx = 0;
      round += 1;
    }
    await savePatch({ tracker: { ...t, turn_index: idx, round } });
    const who = t.entries[idx];
    await logEvent("combat.turn", {
      round,
      name: who.name,
      value: who.value,
    });
  }

  async function handlePrev() {
    const t = currentTracker();
    if (t.entries.length === 0) return;
    let idx = t.turn_index - 1;
    let round = t.round;
    if (idx < 0) {
      idx = t.entries.length - 1;
      round = Math.max(1, round - 1);
    }
    await savePatch({ tracker: { ...t, turn_index: idx, round } });
  }

  async function handleResetInitiative() {
    const t = currentTracker();
    await savePatch({ tracker: { ...t, turn_index: 0, round: 1 } });
  }

  async function handleEndCombat() {
    const t = currentTracker();
    await savePatch({
      tracker: { ...t, active: false, turn_index: 0, round: 1 },
    });
  }

  // ── 卡牌写入：HP 改动写回角色卡本身 ──

  async function handleUpdateCard(card: Card) {
    updateCard(card);
    await runWithError(() => ipc.saveCard(card), "保存卡片失败");
  }

  // ── 掷骰 ──

  async function handleSend(
    kind: ChatEventKind,
    payload: ChatPayload,
    visibility: EventVisibility,
  ) {
    await logEvent(kind, payload, undefined, visibility);
  }

  async function handleQuickRoll(
    roll: RollInfo,
    note: string,
    secret: boolean,
  ) {
    if (!quickCheck) return;
    const { card } = quickCheck;
    await logEvent(
      "chat.roll",
      {
        author_card_id: card.id,
        author_name: card.name,
        content: note || roll.expr,
        roll,
      },
      undefined,
      secret ? "secret" : "public",
    );
    setQuickCheck(null);
  }

  // ── 记录编辑 ──
  // 这三个回调传给对话流，身份必须稳定，否则 ChatMessage 的 memo 形同虚设

  const handleEditEvent = useCallback((event: GameEvent) => {
    setEditingEvent(event);
  }, []);

  async function handleSaveEvent(
    payload: unknown,
    note?: string,
  ): Promise<void> {
    if (!editingEvent) return;
    try {
      await updateEvent(editingEvent.seq, payload, note);
    } catch (e) {
      toast.error("保存失败: " + e);
      throw e;
    }
  }

  const handleDeleteEvent = useCallback(
    async (event: GameEvent) => {
      if (
        !(await confirmDialog({
          message: `删除这条消息？#${event.seq}`,
          confirmLabel: "删除",
          danger: true,
        }))
      )
        return;
      await deleteEvent(event.seq);
    },
    [deleteEvent],
  );

  const handleRevealEvent = useCallback(
    async (event: GameEvent) => {
      await revealEvent(event.seq);
    },
    [revealEvent],
  );

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-app)",
      }}
    >
      <SessionTopBar
        session={session}
        boards={boards}
        view={view}
        ruleSet={ruleSet}
        onRename={(name) => savePatch({ name })}
        onSelectBoard={handleSelectBoard}
        onViewChange={setView}
        onRuleSetChange={(id) => void savePatch({ rule_set: id })}
        onOpenReplay={() => setReplayOpen(true)}
      />

      <InitiativeBar
        tracker={session.tracker ?? null}
        view={view}
        onStart={() => setInitiativeOpen(true)}
        onPrev={() => void handlePrev()}
        onNext={() => void handleNext()}
        onReset={() => void handleResetInitiative()}
        onEnd={() => void handleEndCombat()}
      />

      <div ref={splitRef} style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {chatCollapsed ? (
          <div
            style={{
              width: 28,
              borderRight: "1px solid var(--border-subtle)",
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
              onClick={() => setChatCollapsed(false)}
              title="展开对话面板"
              style={{ padding: "2px 6px", fontSize: 12, lineHeight: 1 }}
            >
              ⟨
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
              对话
            </span>
          </div>
        ) : (
          <>
            <div
              style={{
                flex: `0 0 ${chatPct}%`,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <ChatPanel
                events={events}
                cards={cards}
                cardTypes={cardTypes}
                authors={authors}
                view={view}
                ruleSet={ruleSet}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
                onRevealEvent={handleRevealEvent}
                onSend={handleSend}
                onCollapse={() => setChatCollapsed(true)}
              />
            </div>

            <div
              onMouseDown={startDrag}
              className={`session-resize-handle${dragging ? " is-active" : ""}`}
              style={{
                width: 6,
                flexShrink: 0,
                position: "relative",
                cursor: "col-resize",
                background: "transparent",
                outline: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 2,
                  background: "var(--border-strong)",
                  opacity: 0.5,
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
              <SessionStage
                session={session}
                board={board}
                effectiveBoard={effectiveBoard}
                cards={cards}
                cardTypes={cardTypes}
                zoom={zoom}
                onZoomChange={setZoom}
                onPileClick={(id) => setPileDrawTokenId(id)}
                onTokensChange={handleTokensChange}
                selectedTokenId={selectedTokenId}
                onSelectToken={selectToken}
                view={view}
                onUpdateCard={(card) => void handleUpdateCard(card)}
                onQuickCheck={(stat, card) => setQuickCheck({ stat, card })}
              />
            </div>
          </>
        )}
      </div>

      {editingEvent && (
        <EventEditorDialog
          event={editingEvent}
          onSave={handleSaveEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {replayOpen && (
        <BoardReplay
          events={events}
          boardWidth={width}
          boardHeight={height}
          onSeedSnapshot={handleSeedSnapshot}
          onClose={() => setReplayOpen(false)}
        />
      )}

      {initiativeOpen && (
        <InitiativeDialog
          candidates={initiativeCandidates}
          existing={session.tracker?.entries ?? []}
          ruleSet={ruleSet}
          onApply={(entries) => void handleInitiativeApply(entries)}
          onClose={() => setInitiativeOpen(false)}
        />
      )}

      {quickCheck && (
        <RollDialog
          key={`${quickCheck.card.id}:${quickCheck.stat.key}`}
          ruleSet={ruleSet}
          defaultSecret={false}
          initialExpr={getRuleSet(ruleSet).defaultExpr}
          initialTarget={String(quickCheck.stat.value)}
          initialNote={`${quickCheck.card.name} · ${quickCheck.stat.label}`}
          onRoll={handleQuickRoll}
          onClose={() => setQuickCheck(null)}
        />
      )}

      {pileDrawTokenId &&
        (() => {
          const t = session.tokens.find((x) => x.id === pileDrawTokenId);
          if (!t?.pile) return null;
          return (
            <PileDrawDialog
              pile={t.pile}
              onDraw={(n) => void drawFromPile(pileDrawTokenId, n)}
              onShuffle={() => void shufflePile(pileDrawTokenId)}
              onReset={() => void resetPile(pileDrawTokenId)}
              onClose={() => setPileDrawTokenId(null)}
            />
          );
        })()}
    </div>
  );
}
