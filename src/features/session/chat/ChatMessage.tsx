import { memo, useState } from "react";
import type {
  Card,
  CardType,
  ChatPayload,
  GameEvent,
} from "../../../core/ipc";
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
  /** 卡牌查找表。整表建一次 Map，别让每条消息各扫一遍数组 */
  cardMap: Map<string, Card>;
  typeMap: Map<string, CardType>;
  onEdit: (event: GameEvent) => void;
  onDelete: (event: GameEvent) => void;
}

function ChatMessageInner({
  event,
  cardMap,
  typeMap,
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
      {hover && (
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
          <button
            className="btn btn-danger"
            onClick={() => onDelete(event)}
            style={{ fontSize: 10, padding: "1px 6px" }}
            title="删除"
          >
            删除
          </button>
        </div>
      )}

      {isChatKind(event.kind) ? (
        <ChatBody
          kind={event.kind}
          payload={event.payload as ChatPayload}
          cardMap={cardMap}
          typeMap={typeMap}
        />
      ) : (
        <SystemLine event={event} />
      )}
    </div>
  );
}

/**
 * memo 是必需的：新来一条消息会让整个列表重渲染，
 * 没有 memo 时几百条旧消息会全部重新走一遍。
 * 前提是调用方把 cardMap / typeMap 与回调都传稳定的引用。
 */
export const ChatMessage = memo(ChatMessageInner);

function ChatBody({
  kind,
  payload,
  cardMap,
  typeMap,
}: {
  kind: string;
  payload: ChatPayload;
  cardMap: Map<string, Card>;
  typeMap: Map<string, CardType>;
}) {
  const authorName = payload.author_name ?? "未知";
  const authorCard = payload.author_card_id
    ? (cardMap.get(payload.author_card_id) ?? null)
    : null;
  const authorType = authorCard
    ? (typeMap.get(authorCard.type_id) ?? null)
    : null;
  const color = authorType?.color ?? "var(--fg-secondary)";
  const cardId = payload.author_card_id ?? null;

  switch (kind) {
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
