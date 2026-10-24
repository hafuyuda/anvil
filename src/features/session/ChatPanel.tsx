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
  events: GameEvent[];
  cards: Card[];
  cardTypes: CardType[];
  authors: AuthorOption[];
  onEditEvent: (event: GameEvent) => void;
  onDeleteEvent: (event: GameEvent) => void;
  onSend: (kind: ChatEventKind, payload: ChatPayload) => void;
  /** 提供则在头部显示折叠按钮，折叠由父级控制 */
  onCollapse?: () => void;
}

export function ChatPanel({
  events,
  cards,
  cardTypes,
  authors,
  onEditEvent,
  onDeleteEvent,
  onSend,
  onCollapse,
}: Props) {
  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
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
        <span
          style={{
            fontFamily: "var(--font-mono)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {events.length} 条
          {onCollapse && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCollapse}
              title="折叠对话面板"
              style={{ padding: "2px 6px", fontSize: 12, lineHeight: 1 }}
            >
              ⟩
            </button>
          )}
        </span>
      </div>

      <ChatLog
        events={events}
        cards={cards}
        cardTypes={cardTypes}
        onEdit={onEditEvent}
        onDelete={onDeleteEvent}
      />

      <ChatInput authors={authors} onSend={onSend} />
    </div>
  );
}
