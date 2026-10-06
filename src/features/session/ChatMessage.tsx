import { useState } from "react";
import type { Card, CardType, GameEvent, ChatPayload } from "../../core/ipc";
import { isChatKind } from "../../core/ipc";

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
      {/* 操作按钮 */}
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

  switch (event.kind) {
    case "chat.say":
      return (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <Avatar name={authorName} color={color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <NameLine name={authorName} color={color} />
            <Bubble>{payload.content}</Bubble>
          </div>
        </div>
      );

    case "chat.action":
      return (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <Avatar name={authorName} color={color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <NameLine name={authorName} color={color} />
            <div
              style={{
                fontSize: 13,
                fontStyle: "italic",
                color: "var(--chat-action-text)",
                padding: "4px 0",
              }}
            >
              {payload.content}
            </div>
          </div>
        </div>
      );

    case "chat.roll": {
      const roll = payload.roll;
      return (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <Avatar name={authorName} color={color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <NameLine name={authorName} color={color} />
            <div
              style={{
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                background: "var(--chat-roll-bg)",
                borderRadius: "var(--radius-md)",
                padding: "6px 8px",
                border: "1px solid var(--chat-roll-border)",
                color: "var(--fg-primary)",
              }}
            >
              <div>
                {payload.content}{" "}
                {roll && (
                  <span
                    style={{
                      color: "var(--chat-roll-accent)",
                      fontWeight: 600,
                    }}
                  >
                    = {roll.result}
                  </span>
                )}
              </div>
              {roll && (
                <div
                  style={{
                    color: "var(--fg-muted)",
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {roll.expr} → [{roll.detail.join(", ")}]
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "chat.narration":
      return (
        <div
          style={{
            margin: "12px 0",
            padding: "8px 12px",
            background: "var(--chat-narration-bg)",
            borderLeft: "3px solid var(--chat-narration-border)",
            fontSize: 13,
            fontStyle: "italic",
            color: "var(--chat-narration-text)",
            whiteSpace: "pre-wrap",
            fontFamily: "var(--font-title)",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
          }}
        >
          {payload.content}
        </div>
      );

    case "chat.ooc":
      return (
        <div
          style={{
            margin: "8px 0",
            padding: "4px 8px",
            background: "var(--chat-ooc-bg)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
            color: "var(--chat-ooc-text)",
          }}
        >
          <span style={{ opacity: 0.7, marginRight: 6 }}>[场外]</span>
          {authorName}：{payload.content}
        </div>
      );

    case "chat.whisper":
      return (
        <div
          style={{
            margin: "8px 0",
            padding: "4px 8px",
            background: "var(--chat-whisper-bg)",
            border: "1px dashed var(--chat-whisper-border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
            color: "var(--chat-whisper-text)",
          }}
        >
          <span style={{ opacity: 0.7, marginRight: 6 }}>[私聊]</span>
          {authorName} → {payload.content}
        </div>
      );

    default:
      return null;
  }
}

function Avatar({ name, color }: { name: string; color: string }) {
  const letter = name.slice(0, 1);
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: `${color}33`,
        border: `2px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--fg-primary)",
        flexShrink: 0,
      }}
      title={name}
    >
      {letter}
    </div>
  );
}

function NameLine({ name, color }: { name: string; color: string }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color,
        marginBottom: 2,
      }}
    >
      {name}
    </div>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        background: "var(--chat-bubble-bg)",
        border: "1px solid var(--chat-bubble-border)",
        borderRadius: "var(--radius-md)",
        fontSize: 13,
        lineHeight: 1.5,
        color: "var(--chat-bubble-text)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {children}
    </div>
  );
}

function SystemLine({ event }: { event: GameEvent }) {
  const text = systemText(event);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "10px 0",
        fontSize: 11,
        color: "var(--chat-system-text)",
      }}
    >
      <div
        style={{ flex: 1, height: 1, background: "var(--chat-system-line)" }}
      />
      <span>{text}</span>
      <div
        style={{ flex: 1, height: 1, background: "var(--chat-system-line)" }}
      />
    </div>
  );
}

function systemText(event: GameEvent): string {
  const payload = event.payload as Record<string, unknown>;
  switch (event.kind) {
    case "session.start":
      return "会话开始";
    case "session.end":
      return "会话结束";
    case "token.move":
      return `Token 变动（${payload.count ?? "?"} 个）`;
    case "state.set": {
      const k = payload.key ?? "?";
      const v = payload.value;
      return `状态：${k} = ${JSON.stringify(v)}`;
    }
    case "effect.apply": {
      const applied = payload.applied as
        | Array<{
            raw: string;
            is_roll?: boolean;
            roll_detail?: number[];
          }>
        | undefined;
      const label = payload.relation_label as string | undefined;
      if (!applied || applied.length === 0) {
        return label ? `效果：${label}` : "效果执行";
      }
      const parts = applied.map((a) => {
        const rollInfo =
          a.is_roll && a.roll_detail && a.roll_detail.length > 0
            ? ` [${a.roll_detail.join(",")}]`
            : "";
        return `${a.raw}${rollInfo}`;
      });
      const prefix = label ? `${label} → ` : "";
      return `${prefix}效果：${parts.join(" · ")}`;
    }
    case "note":
      return event.note ?? "备注";
    default:
      return event.kind;
  }
}
