import type {
  Card,
  CardType,
  ChatEventKind,
  ChatPayload,
  EventVisibility,
  GameEvent,
  SessionViewMode,
} from "../../core/ipc";
import { isEventVisible } from "../../core/ipc";
import { ChatLog } from "./chat/ChatLog";
import { ChatInput } from "./chat/ChatInput";
import type { RuleSetId } from "./ruleset";

interface AuthorOption {
  card_id: string | null;
  name: string;
}

interface Props {
  events: GameEvent[];
  cards: Card[];
  cardTypes: CardType[];
  authors: AuthorOption[];
  view: SessionViewMode;
  ruleSet: RuleSetId;
  onEditEvent: (event: GameEvent) => void;
  onDeleteEvent: (event: GameEvent) => void;
  onRevealEvent: (event: GameEvent) => void;
  onSend: (
    kind: ChatEventKind,
    payload: ChatPayload,
    visibility: EventVisibility,
  ) => void;
  /** 提供则在头部显示折叠按钮，折叠由父级控制 */
  onCollapse?: () => void;
}

export function ChatPanel({
  events,
  cards,
  cardTypes,
  authors,
  view,
  ruleSet,
  onEditEvent,
  onDeleteEvent,
  onRevealEvent,
  onSend,
  onCollapse,
}: Props) {
  const shown = events.filter((e) => isEventVisible(e, view)).length;
  const hidden = events.length - shown;

  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border-subtle)",
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
        <span>
          {view === "player" ? "对话记录 · 玩家视图" : "对话记录 · KP 全景"}
        </span>
        <span
          style={{ fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: 8 }}
        >
          {shown} 条
          {hidden > 0 && ` （+${hidden} 秘密）`}
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
        view={view}
        onEdit={view === "gm" ? onEditEvent : undefined}
        onDelete={onDeleteEvent}
        onReveal={view === "gm" ? onRevealEvent : undefined}
      />

      <ChatInput
        authors={authors}
        defaultAuthorId={null}
        ruleSet={ruleSet}
        view={view}
        onSend={onSend}
      />
    </div>
  );
}
