import { useState } from "react";
import type { Card, CardType, GameEvent, ChatPayload } from "../../../core/ipc";
import { isChatKind } from "../../../core/ipc";
import {
  ActionMessage,
  NarrationMessage,
  OocMessage,
  SayMessage,
  WhisperMessage,
} from "./ChatBubbles";
import { RollMessage } from "./ChatRollMessage";
import { SystemLine } from "./ChatSystemLine";

interface Props {
  event: GameEvent;
  cards: Card[];
  cardTypes: CardType[];
  onEdit?: (event: GameEvent) => void;
  onDelete?: (event: GameEvent) => void;
}

export function ChatMessage({
  event,
  cards,
  cardTypes,
  onEdit,
  onDelete,
}: Props) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative" }}
    >
      {(onEdit || onDelete) && hover && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            display: "flex",
            gap: 4,
            zIndex: 10,
          }}
        >
          {onEdit && (
            <button
              className="btn"
              onClick={() => onEdit(event)}
              style={{
                fontSize: 10,
                padding: "1px 6px",
                background: "var(--bg-raised)",
              }}
              title="编辑"
            >
              编辑
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-danger"
              onClick={() => onDelete(event)}
              style={{ fontSize: 10, padding: "1px 6px" }}
              title="删除"
            >
              删除
            </button>
          )}
        </div>
      )}

      {isChatKind(event.kind) ? (
        <ChatBody event={event} cards={cards} cardTypes={cardTypes} />
      ) : (
        <SystemLine event={event} />
      )}
    </div>
  );
}

function ChatBody({
  event,
  cards,
  cardTypes,
}: {
  event: GameEvent;
  cards: Card[];
  cardTypes: CardType[];
}) {
  const payload = event.payload as ChatPayload;
  const authorName = payload.author_name ?? "未知";
  const authorCard = payload.author_card_id
    ? (cards.find((c) => c.id === payload.author_card_id) ?? null)
    : null;
  const authorType = authorCard
    ? (cardTypes.find((t) => t.id === authorCard.type_id) ?? null)
    : null;
  const color = authorType?.color ?? "var(--fg-secondary)";

  const cardId = payload.author_card_id ?? null;

  switch (event.kind) {
    case "chat.say":
      return (
        <SayMessage
          payload={payload}
          authorName={authorName}
          color={color}
          cardId={cardId}
        />
      );
    case "chat.action":
      return (
        <ActionMessage
          payload={payload}
          authorName={authorName}
          color={color}
          cardId={cardId}
        />
      );
    case "chat.roll":
      return (
        <RollMessage
          payload={payload}
          authorName={authorName}
          color={color}
          cardId={cardId}
        />
      );
    case "chat.narration":
      return <NarrationMessage payload={payload} />;
    case "chat.ooc":
      return <OocMessage payload={payload} authorName={authorName} />;
    case "chat.whisper":
      return <WhisperMessage payload={payload} authorName={authorName} />;
    default:
      return null;
  }
}
