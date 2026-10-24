import type { ChatPayload } from "../../../core/ipc";
import { Avatar, NameLine } from "./ChatBubbles";

export function RollMessage({
  payload,
  authorName,
  color,
  cardId,
}: {
  payload: ChatPayload;
  authorName: string;
  color: string;
  cardId?: string | null;
}) {
  const roll = payload.roll;

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      <Avatar name={authorName} color={color} cardId={cardId} />
      <div className="grow">
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
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span>{payload.content}</span>
            {roll && (
              <span
                style={{ color: "var(--chat-roll-accent)", fontWeight: 600 }}
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
              {roll.expr}
              {roll.detail.length > 0 && ` → [${roll.detail.join(", ")}]`}
              {roll.dropped &&
                roll.dropped.length > 0 &&
                ` 弃 [${roll.dropped.join(", ")}]`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
