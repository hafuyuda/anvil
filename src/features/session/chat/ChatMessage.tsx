import { memo, useState } from "react";
import type {
  Card,
  CardType,
  ChatPayload,
  GameEvent,
  SessionViewMode,
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
  view: SessionViewMode;
  onEdit?: (event: GameEvent) => void;
  onDelete?: (event: GameEvent) => void;
  onReveal?: (event: GameEvent) => void;
}

function ChatMessageInner({
  event,
  cardMap,
  typeMap,
  view,
  onEdit,
  onDelete,
  onReveal,
}: Props) {
  const [hover, setHover] = useState(false);

  const secret = (event.visibility ?? "public") === "secret";
  const isReveal = event.kind === "chat.reveal";
  const readOnly = view === "player";

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        // 秘密消息用虚线框 + 专属底色，一眼能从公开流里分出来
        borderLeft: secret
          ? "2px dashed var(--chat-secret-border)"
          : isReveal
            ? "2px solid var(--chat-reveal-border)"
            : "2px solid transparent",
        paddingLeft: secret || isReveal ? 8 : 0,
        marginLeft: secret || isReveal ? -8 : 0,
        borderRadius: "var(--radius-sm)",
        background: secret ? "var(--chat-secret-bg)" : "transparent",
      }}
    >
      {!readOnly && (onEdit || onDelete) && hover && (
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

      {secret && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 0 4px",
          }}
        >
          <span
            style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: "var(--radius-sm)",
              color: "var(--chat-secret-text)",
              border: "1px dashed var(--chat-secret-border)",
              letterSpacing: 0.5,
            }}
          >
            秘密{event.revealed ? " · 已揭示" : ""}
          </span>
          {!event.revealed && !readOnly && onReveal && (
            <button
              className="btn"
              onClick={() => onReveal(event)}
              style={{ fontSize: 10, padding: "1px 6px" }}
              title="把这条内容公开给玩家"
            >
              揭示
            </button>
          )}
        </div>
      )}

      {isReveal && (
        <div style={{ padding: "2px 0 4px" }}>
          <span
            style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: "var(--radius-sm)",
              color: "var(--chat-reveal-text)",
              border: "1px solid var(--chat-reveal-border)",
              letterSpacing: 0.5,
            }}
          >
            揭示
          </span>
        </div>
      )}

      {isReveal ? (
        <RevealBody
          payload={event.payload as ChatPayload}
          cardMap={cardMap}
          typeMap={typeMap}
        />
      ) : isChatKind(event.kind) ? (
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
 * 前提是调用方把 cardMap / typeMap 与三个回调都传稳定的引用。
 */
export const ChatMessage = memo(ChatMessageInner);

/**
 * chat.reveal 是秘密消息的公开副本。
 * 它沿用原始种类渲染，玩家看到的就是一条普通消息 —— 只是位置在后、带揭示标记。
 */
function RevealBody({
  payload,
  cardMap,
  typeMap,
}: {
  payload: ChatPayload;
  cardMap: Map<string, Card>;
  typeMap: Map<string, CardType>;
}) {
  return (
    <ChatBody
      kind={payload.revealed_kind ?? "chat.say"}
      payload={payload}
      cardMap={cardMap}
      typeMap={typeMap}
    />
  );
}

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
