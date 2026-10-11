import { useEffect, useMemo, useRef, useState } from "react";
import {
  ipc,
  type Board,
  type ChatEventKind,
  type ChatPayload,
  type GameEvent,
  type GridConfig,
  type Session,
  type Token,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { DEFAULT_GRID } from "../board/constants";
import { usePileActions } from "../board/usePileActions";
import { PileDrawDialog } from "../board/PileDrawDialog";
import { nowMs } from "../../lib/time";
import { newId, makeUndoId } from "../../lib/id";
import { toast } from "../../lib/toast";
import { confirmDialog } from "../../lib/confirm";
import { runWithError } from "../../lib/runWithError";
import { SessionTopBar } from "./SessionTopBar";
import { SessionStage } from "./SessionStage";
import { ChatPanel } from "./ChatPanel";
import { EventEditorDialog } from "./EventEditorDialog";
import { useSessionEvents } from "./useSessionEvents";

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
  const [chatHeight, setChatHeight] = useState(340);
  const [resizingChat, setResizingChat] = useState(false);
  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);
  const [pileDrawTokenId, setPileDrawTokenId] = useState<string | null>(null);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const sessionContainerRef = useRef<HTMLDivElement | null>(null);

  const { events, logEvent, updateEvent, deleteEvent } = useSessionEvents(
    session.id,
  );

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

  // 切换会话时重置缩放和聊天区高度
  useEffect(() => {
    setZoom(1);
    setChatHeight(340);
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
    await runWithError(() => ipc.upsertSession(next), "保存失败");
  }

  const { drawFromPile, shufflePile, resetPile } = usePileActions({
    tokens: session.tokens,
    applyTokens: (next, label) => savePatch({ tokens: next }, label),
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
          await persist(before);
        },
        redo: async () => {
          await persist(after);
        },
      });
    }
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
    await logEvent("session.start", { board_id: b.id });
  }

  async function handleTokensChange(tokens: Token[]) {
    await savePatch({ tokens });
  }

  async function handleSend(kind: ChatEventKind, payload: ChatPayload) {
    await logEvent(kind, payload);
  }

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

  async function handleDeleteEvent(event: GameEvent) {
    if (
      !(await confirmDialog({
        message: `删除这条消息？#${event.seq}`,
        confirmLabel: "删除",
        danger: true,
      }))
    )
      return;
    await deleteEvent(event.seq);
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
      <SessionTopBar
        session={session}
        boards={boards}
        onRename={(name) => savePatch({ name })}
        onSelectBoard={handleSelectBoard}
      />

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
      />

      <ChatPanel
        height={chatHeight}
        resizing={resizingChat}
        onResizeStart={() => setResizingChat(true)}
        events={events}
        cards={cards}
        cardTypes={cardTypes}
        authors={authors}
        onEditEvent={(event) => setEditingEvent(event)}
        onDeleteEvent={handleDeleteEvent}
        onSend={handleSend}
      />

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
