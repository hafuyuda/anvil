import { useEffect, useMemo, useRef, useState } from "react";
import {
  Board,
  ipc,
  type ChatEventKind,
  type ChatPayload,
  type GameEvent,
  type GridConfig,
  type Session,
  type Token,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { BoardCanvas } from "../board/BoardCanvas";
import { DEFAULT_GRID } from "../board/constants";
import { nowMs } from "../../lib/time";
import { newId } from "../../lib/id";
import { SaveInput } from "../../components/SaveInput";
import { ChatLog } from "./chat/ChatLog";
import { ChatInput } from "./chat/ChatInput";
import { PartyPanel } from "./PartyPanel";
import { EventEditorDialog } from "./EventEditorDialog";
import { usePileActions } from "../board/usePileActions";
import { PileDrawDialog } from "../board/PileDrawDialog";

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

  const selectedTokenId = useProjectStore((s) => s.selectedTokenId);
  const selectToken = useProjectStore((s) => s.selectToken);

  const [zoom, setZoom] = useState(1);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [chatHeight, setChatHeight] = useState(340);
  const [resizingChat, setResizingChat] = useState(false);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const sessionContainerRef = useRef<HTMLDivElement | null>(null);

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

  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);
  const [pileDrawTokenId, setPileDrawTokenId] = useState<string | null>(null);

  // 切换会话时重置缩放和聊天区高度
  useEffect(() => {
    setZoom(1);
    setChatHeight(340);
  }, [session.id]);

  // 加载事件
  useEffect(() => {
    ipc
      .listEvents(session.id)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [session.id]);

  // 登记当前会话（供检查器使用）
  useEffect(() => {
    setCurrentSession(session.id);
    return () => {
      setCurrentSession(null);
    };
  }, [session.id, setCurrentSession]);

  // 聊天区高度拖拽
  useEffect(() => {
    if (!resizingChat) return;

    function onMove(e: MouseEvent) {
      const rect = sessionContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newHeight = rect.bottom - e.clientY;
      setChatHeight(Math.max(160, Math.min(rect.height - 200, newHeight)));
    }
    function onUp() {
      setResizingChat(false);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizingChat]);

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

  async function persist(next: Session) {
    upsertSession(next);
    try {
      await ipc.upsertSession(next);
    } catch (e) {
      alert("保存失败: " + e);
    }
  }

  const { drawFromPile, shufflePile, resetPile } = usePileActions({
    tokens: session.tokens,
    applyTokens: async (next, label) => {
      const before = sessionRef.current.tokens;
      const after: Session = {
        ...sessionRef.current,
        tokens: next,
        updated_at: nowMs(),
      };
      await persist(after);
      pushUndo({
        id: `${Date.now()}-${newId().slice(2, 8)}`,
        label,
        undo: async () => {
          await persist({
            ...sessionRef.current,
            tokens: before,
            updated_at: nowMs(),
          });
        },
        redo: async () => {
          await persist(after);
        },
      });
    },
  });

  async function savePatch(patch: Partial<Session>) {
    const next: Session = {
      ...sessionRef.current,
      ...patch,
      updated_at: nowMs(),
    };
    await persist(next);
  }

  async function logEvent(
    kind: string,
    payload: unknown,
    note?: string,
  ): Promise<void> {
    try {
      await ipc.appendEvent(session.id, kind, payload, note);
      const updated = await ipc.listEvents(session.id);
      setEvents(updated);
    } catch (e) {
      alert("记录事件失败: " + e);
    }
  }

  async function handleSelectBoard(boardId: string) {
    if (!boardId) {
      await savePatch({ board_id: null, tokens: [] });
      return;
    }
    if (
      session.tokens.length > 0 &&
      !confirm("切换棋盘会清空本会话的 Token，继续？")
    ) {
      return;
    }
    const b = boards.find((x) => x.id === boardId);
    if (!b) return;
    const cloned: Token[] = (b.tokens ?? []).map((t) => ({
      ...t,
      id: newId(),
    }));
    await savePatch({ board_id: b.id, tokens: cloned });
    await logEvent("session.start", { board_id: b.id });
  }

  async function handleTokensChange(tokens: Token[]) {
    await savePatch({ tokens });
  }

  async function handleSend(kind: ChatEventKind, payload: ChatPayload) {
    await logEvent(kind, payload);
  }

  async function handleEditEvent(event: GameEvent) {
    setEditingEvent(event);
  }

  async function handleSaveEvent(
    payload: unknown,
    note?: string,
  ): Promise<void> {
    if (!editingEvent) return;
    try {
      await ipc.updateEvent(session.id, editingEvent.seq, payload, note);
      const updated = await ipc.listEvents(session.id);
      setEvents(updated);
    } catch (e) {
      alert("保存失败: " + e);
      throw e;
    }
  }

  async function handleDeleteEvent(event: GameEvent) {
    if (!confirm(`删除这条消息？#${event.seq}`)) return;
    try {
      await ipc.deleteEvent(session.id, event.seq);
      const updated = await ipc.listEvents(session.id);
      setEvents(updated);
    } catch (e) {
      alert("删除失败: " + e);
    }
  }

  return (
    <div
      ref={sessionContainerRef}
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-app)",
      }}
    >
      {/* 顶栏 */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          flexShrink: 0,
        }}
      >
        <SaveInput
          value={session.name}
          onCommit={(name) => savePatch({ name })}
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-title)",
          }}
        />
        <label
          style={{
            fontSize: 12,
            display: "flex",
            gap: 6,
            alignItems: "center",
            color: "var(--fg-secondary)",
          }}
        >
          战场棋盘
          <select
            className="select"
            value={session.board_id ?? ""}
            onChange={(e) => handleSelectBoard(e.target.value)}
            style={{ minWidth: 140, width: "auto" }}
          >
            <option value="">— 无 —</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 中部：舞台 + 角色列表 */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {board ? (
            <BoardCanvas
              board={effectiveBoard}
              zoom={zoom}
              onZoomChange={setZoom}
              onPileClick={(id) => setPileDrawTokenId(id)}
              onChange={(patch) => {
                if (patch.tokens) {
                  handleTokensChange(patch.tokens);
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
        <PartyPanel
          session={session}
          cards={cards}
          cardTypes={cardTypes}
          selectedTokenId={selectedTokenId}
          onSelectToken={selectToken}
        />
      </div>

      {/* 拖拽条 */}
      <div
        onMouseDown={() => setResizingChat(true)}
        style={{
          height: 4,
          cursor: "row-resize",
          background: resizingChat ? "var(--accent-gold)" : "transparent",
          flexShrink: 0,
          transition: "background 0.12s",
        }}
        onMouseEnter={(e) => {
          if (!resizingChat) {
            (e.currentTarget as HTMLElement).style.background =
              "var(--border-strong)";
          }
        }}
        onMouseLeave={(e) => {
          if (!resizingChat) {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      />

      {/* 底部：对话流 + 输入 */}
      <div
        style={{
          height: chatHeight,
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          background: "var(--bg-panel)",
        }}
      >
        <div
          style={{
            padding: "6px 12px",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: 11,
            color: "var(--fg-muted)",
            display: "flex",
            justifyContent: "space-between",
            textTransform: "uppercase",
            letterSpacing: 1,
            flexShrink: 0,
          }}
        >
          <span>对话记录</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {events.length} 条
          </span>
        </div>

        <ChatLog
          events={events}
          cards={cards}
          cardTypes={cardTypes}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
        />

        <ChatInput
          authors={authors}
          defaultAuthorId={null}
          onSend={handleSend}
        />
      </div>
      {editingEvent && (
        <EventEditorDialog
          event={editingEvent}
          onSave={handleSaveEvent}
          onClose={() => setEditingEvent(null)}
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
