import { useEffect, useRef } from "react";
import type { Card, CardType, GameEvent } from "../../core/ipc";
import { ChatMessage } from "./ChatMessage";

interface Props {
  events: GameEvent[];
  cards: Card[];
  cardTypes: CardType[];
  filter?: "all" | "chat";
}

export function ChatLog({ events, cards, cardTypes, filter = "all" }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  const shown =
    filter === "chat"
      ? events.filter((e) => e.kind.startsWith("chat."))
      : events;

  if (shown.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-muted)",
          fontSize: 12,
          background: "var(--chat-panel-bg)",
        }}
      >
        还没有消息，下面输入框开始吧
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: "8px 12px",
        background: "var(--chat-panel-bg)",
      }}
    >
      {shown.map((e) => (
        <ChatMessage
          key={e.seq}
          event={e}
          cards={cards}
          cardTypes={cardTypes}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
