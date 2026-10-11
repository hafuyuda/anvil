import type {
  Card,
  CardType,
  ChatEventKind,
  ChatPayload,
  GameEvent,
} from "../../core/ipc";
import { ChatLog } from "./chat/ChatLog";
import { ChatInput } from "./chat/ChatInput";

interface AuthorOption {
  card_id: string | null;
  name: string;
}

interface Props {
  height: number;
  resizing: boolean;
  onResizeStart: () => void;
  events: GameEvent[];
  cards: Card[];
  cardTypes: CardType[];
  authors: AuthorOption[];
  onEditEvent: (event: GameEvent) => void;
  onDeleteEvent: (event: GameEvent) => void;
  onSend: (kind: ChatEventKind, payload: ChatPayload) => void;
}

export function ChatPanel({
  height,
  resizing,
  onResizeStart,
  events,
  cards,
  cardTypes,
  authors,
  onEditEvent,
  onDeleteEvent,
  onSend,
}: Props) {
  return (
    <>
      {/* 拖拽条 */}
      <div
        onMouseDown={onResizeStart}
        style={{
          height: 4,
          cursor: "row-resize",
          background: resizing ? "var(--accent-gold)" : "transparent",
          flexShrink: 0,
          transition: "background 0.12s",
        }}
        onMouseEnter={(e) => {
          if (!resizing) {
            (e.currentTarget as HTMLElement).style.background =
              "var(--border-strong)";
          }
        }}
        onMouseLeave={(e) => {
          if (!resizing) {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      />

      {/* 对话流 + 输入 */}
      <div
        style={{
          height,
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
          onEdit={onEditEvent}
          onDelete={onDeleteEvent}
        />

        <ChatInput authors={authors} defaultAuthorId={null} onSend={onSend} />
      </div>
    </>
  );
}
