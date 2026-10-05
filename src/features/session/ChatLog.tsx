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
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 事件变化时滚到底部
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
          color: "#aaa",
          fontSize: 12,
        }}
      >
        还没有消息，下面输入框开始吧
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: "8px 12px",
        background: "#fbfbfb",
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
