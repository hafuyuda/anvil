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
import { BoardCanvas } from "../board/BoardCanvas";
import { DEFAULT_GRID } from "../board/constants";
import { nowMs } from "../../lib/time";
import { newId } from "../../lib/id";
import { SaveInput } from "../../components/SaveInput";
import { ChatLog } from "./ChatLog";
import { ChatInput } from "./ChatInput";
import { PartyPanel } from "./PartyPanel";

interface Props {
  session: Session;
}

export function SessionEditor({ session }: Props) {
  const boards = useProjectStore((s) => s.boards) ?? [];
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const upsertSession = useProjectStore((s) => s.upsertSession);

  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const board = session.board_id
    ? (boards.find((b) => b.id === session.board_id) ?? null)
    : null;

  const grid: GridConfig = board?.grid ?? DEFAULT_GRID;
  const width = board?.width ?? 1200;
  const height = board?.height ?? 800;

  useEffect(() => {
    ipc
      .listEvents(session.id)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [session.id]);

  // 参与角色：token 对应的卡（去重）
  const authors = useMemo(() => {
    const seen = new Set<string>();
    const out: { card_id: string | null; name: string }[] = [];
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
    // token.move 不写日志，避免刷屏
  }

  async function handleSend(kind: ChatEventKind, payload: ChatPayload) {
    await logEvent(kind, payload);
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 顶栏 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          paddingBottom: 8,
          borderBottom: "1px solid #eee",
          flexShrink: 0,
        }}
      >
        <SaveInput
          value={session.name}
          onCommit={(name) => savePatch({ name })}
          style={{
            padding: "4px 8px",
            fontSize: 14,
            fontWeight: 600,
            flex: 1,
          }}
        />
        <label
          style={{
            fontSize: 12,
            display: "flex",
            gap: 4,
            alignItems: "center",
          }}
        >
          战场棋盘
          <select
            value={session.board_id ?? ""}
            onChange={(e) => handleSelectBoard(e.target.value)}
            style={{ padding: "4px 6px" }}
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

      {/* 中部：舞台 + 角色面板 */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {board ? (
            <BoardCanvas
              width={width}
              height={height}
              grid={grid}
              tokens={session.tokens}
              onTokensChange={handleTokensChange}
              selectedTokenId={selectedTokenId}
              onSelectToken={setSelectedTokenId}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#888",
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
          onSelectToken={setSelectedTokenId}
        />
      </div>

      {/* 底部：对话流 + 输入 */}
      <div
        style={{
          height: 320,
          borderTop: "1px solid #eee",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          background: "#fff",
        }}
      >
        <div
          style={{
            padding: "6px 12px",
            borderBottom: "1px solid #f0f0f0",
            fontSize: 11,
            color: "#888",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>对话记录</span>
          <span>{events.length} 条</span>
        </div>

        <ChatLog events={events} cards={cards} cardTypes={cardTypes} />

        <ChatInput
          authors={authors}
          defaultAuthorId={null}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
