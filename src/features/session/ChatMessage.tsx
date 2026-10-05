import type { Card, CardType, GameEvent, ChatPayload } from "../../core/ipc";
import { isChatKind } from "../../core/ipc";

interface Props {
  event: GameEvent;
  cards: Card[];
  cardTypes: CardType[];
}

export function ChatMessage({ event, cards, cardTypes }: Props) {
  if (!isChatKind(event.kind)) {
    return <SystemLine event={event} />;
  }

  const payload = event.payload as ChatPayload;
  const authorName = payload.author_name ?? "未知";
  const authorCard = payload.author_card_id
    ? (cards.find((c) => c.id === payload.author_card_id) ?? null)
    : null;
  const authorType = authorCard
    ? (cardTypes.find((t) => t.id === authorCard.type_id) ?? null)
    : null;
  const color = authorType?.color ?? "#888888";

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
                color: "#555",
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
                fontFamily: "monospace",
                background: "#f4f4f4",
                borderRadius: 4,
                padding: "6px 8px",
                border: "1px solid #e0e0e0",
              }}
            >
              <div>
                {payload.content}{" "}
                {roll && (
                  <span style={{ color: "#369", fontWeight: 600 }}>
                    = {roll.result}
                  </span>
                )}
              </div>
              {roll && (
                <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
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
            background: "#f9f6ef",
            borderLeft: "3px solid #c9a961",
            fontSize: 13,
            fontStyle: "italic",
            color: "#5a4a2f",
            whiteSpace: "pre-wrap",
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
            background: "#f0f0f0",
            borderRadius: 4,
            fontSize: 12,
            color: "#666",
          }}
        >
          <span style={{ color: "#999", marginRight: 6 }}>[场外]</span>
          {authorName}：{payload.content}
        </div>
      );

    case "chat.whisper":
      return (
        <div
          style={{
            margin: "8px 0",
            padding: "4px 8px",
            background: "#f7f0fa",
            border: "1px dashed #c8a8d8",
            borderRadius: 4,
            fontSize: 12,
            color: "#6a4a7a",
          }}
        >
          <span style={{ color: "#a88", marginRight: 6 }}>[私聊]</span>
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
        color: "#333",
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
        background: "#fff",
        border: "1px solid #e5e5e5",
        borderRadius: 6,
        fontSize: 13,
        lineHeight: 1.5,
        color: "#222",
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
        color: "#aaa",
      }}
    >
      <div style={{ flex: 1, height: 1, background: "#eee" }} />
      <span>{text}</span>
      <div style={{ flex: 1, height: 1, background: "#eee" }} />
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
    case "note":
      return event.note ?? "备注";
    default:
      return event.kind;
  }
}
