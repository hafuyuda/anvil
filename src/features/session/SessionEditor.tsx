import { useMemo, useRef, useState, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  ipc,
  type Card,
  type ChatEventKind,
  type ChatPayload,
  type GameEvent,
  type Session,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { clamp } from "../../lib/math";
import { nowMs } from "../../lib/time";
import { makeUndoId } from "../../lib/id";
import { mergeEntity } from "../../lib/undoMerge";
import { toast } from "../../lib/toast";
import { confirmDialog } from "../../lib/confirm";
import { runWithError } from "../../lib/runWithError";
import { SessionTopBar } from "./SessionTopBar";
import { ChatPanel } from "./ChatPanel";
import { PartyPanel } from "./PartyPanel";
import { EventEditorDialog } from "./EventEditorDialog";
import { useSessionEvents } from "./useSessionEvents";
import type { CardStat } from "./cardStats";
import { RollDialog } from "./chat/RollDialog";
import type { RollInfo } from "../../core/ipc";

interface Props {
  session: Session;
}

/**
 * 精简后的跑团会话。
 *
 * 就两件事：左边记下发生了什么，右边看着队伍的状态。
 * 棋盘归棋盘模块，战斗与帷幕已整体移除 —— 详见 docs/DESIGN.md §14。
 */
export function SessionEditor({ session }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const cardGroups = useProjectStore((s) => s.cardGroups) ?? [];
  const upsertSession = useProjectStore((s) => s.upsertSession);
  const pushUndo = useProjectStore((s) => s.pushUndo);
  const updateCard = useProjectStore((s) => s.updateCard);

  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);
  const [quickCheck, setQuickCheck] = useState<{
    stat: CardStat;
    card: Card;
  } | null>(null);

  // ── 两栏分隔（自研，零依赖；水平 flex + 拖拽改 flex-basis）──
  // 沙箱无法访问 npm registry，故不引入 react-resizable-panels，自研一个
  // 更轻的分隔器：即时跟手、localStorage 持久化、聊天可折叠，且天然无过渡，
  // 与「动效只走合成属性 / 尊重 reduced-motion」原则一致。
  const SESSION_LAYOUT_KEY = "anvil-session-layout";
  const [chatPct, setChatPct] = useState<number>(() => {
    const saved = Number(localStorage.getItem(SESSION_LAYOUT_KEY));
    return saved >= 30 && saved <= 80 ? saved : 66;
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
    pct = clamp(pct, 30, 80);
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

  const { events, logEvent, updateEvent, deleteEvent } = useSessionEvents(
    session.id,
  );

  // ── 队伍：来自卡组。角色的一切数据仍在卡牌上，会话只持有引用 ──
  const party = useMemo(() => {
    const group = cardGroups.find((g) => g.id === session.group_id);
    if (!group) return [];
    const out: Card[] = [];
    for (const id of group.card_ids) {
      const c = cards.find((x) => x.id === id);
      if (c) out.push(c);
    }
    return out;
  }, [session.group_id, cardGroups, cards]);

  // 发言者：KP 永远在第一位，其后是队伍成员
  const authors = useMemo(
    () => [
      { card_id: null, name: "KP" },
      ...party.map((c) => ({ card_id: c.id, name: c.name })),
    ],
    [party],
  );

  async function persist(next: Session) {
    upsertSession(next);
    await runWithError(() => ipc.upsertSession(next), "保存失败");
  }

  async function savePatch(patch: Partial<Session>, undoLabel?: string) {
    const before = sessionRef.current;
    const after: Session = { ...before, ...patch, updated_at: nowMs() };
    await persist(after);
    if (!undoLabel) return;
    pushUndo({
      id: makeUndoId(),
      label: undoLabel,
      undo: async () => {
        const cur = currentSession();
        await persist(cur ? mergeEntity(before, after, cur) : before);
      },
      redo: async () => {
        const cur = currentSession();
        await persist(cur ? mergeEntity(after, before, cur) : after);
      },
    });
  }

  /** 撤销 / 重做时从 store 读当前会话，不用渲染时捕获的旧对象。 */
  function currentSession(): Session | null {
    return (
      useProjectStore.getState().sessions.find((s) => s.id === session.id) ?? null
    );
  }

  // ── 卡牌写入：HP 改动写回角色卡本身 ──

  async function handleUpdateCard(card: Card) {
    updateCard(card);
    await runWithError(() => ipc.saveCard(card), "保存卡片失败");
  }

  // ── 掷骰 ──

  async function handleSend(kind: ChatEventKind, payload: ChatPayload) {
    await logEvent(kind, payload);
  }

  async function handleQuickRoll(roll: RollInfo, note: string) {
    if (!quickCheck) return;
    const { card } = quickCheck;
    await logEvent("chat.roll", {
      author_card_id: card.id,
      author_name: card.name,
      content: note || roll.expr,
      roll,
    });
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
        cardGroups={cardGroups}
        onRename={(name) => savePatch({ name })}
        onSelectGroup={(groupId) => void savePatch({ group_id: groupId })}
      />

      <div ref={splitRef} className="fill">
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
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
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
          </>
        )}

        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <PartyPanel
            cardTypes={cardTypes}
            party={party}
            onUpdateCard={(card) => void handleUpdateCard(card)}
            onQuickCheck={(stat, card) => setQuickCheck({ stat, card })}
          />
        </div>
      </div>

      {editingEvent && (
        <EventEditorDialog
          event={editingEvent}
          onSave={handleSaveEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {quickCheck && (
        <RollDialog
          key={`${quickCheck.card.id}:${quickCheck.stat.key}`}
          initialNote={`${quickCheck.card.name} · ${quickCheck.stat.label}`}
          onRoll={handleQuickRoll}
          onClose={() => setQuickCheck(null)}
        />
      )}
    </div>
  );
}
