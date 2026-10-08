import type { ChatPayload } from "../../../core/ipc";

export function Avatar({ name, color }: { name: string; color: string }) {
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

export function NameLine({ name, color }: { name: string; color: string }) {
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

export function Bubble({ children }: { children: React.ReactNode }) {
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

// ── Say ──

export function SayMessage({
  payload,
  authorName,
  color,
}: {
  payload: ChatPayload;
  authorName: string;
  color: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      <Avatar name={authorName} color={color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <NameLine name={authorName} color={color} />
        <Bubble>{payload.content}</Bubble>
      </div>
    </div>
  );
}

// ── Action ──

export function ActionMessage({
  payload,
  authorName,
  color,
}: {
  payload: ChatPayload;
  authorName: string;
  color: string;
}) {
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
}

// ── Narration ──

export function NarrationMessage({ payload }: { payload: ChatPayload }) {
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
}

// ── OOC ──

export function OocMessage({
  payload,
  authorName,
}: {
  payload: ChatPayload;
  authorName: string;
}) {
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
}

// ── Whisper ──

export function WhisperMessage({
  payload,
  authorName,
}: {
  payload: ChatPayload;
  authorName: string;
}) {
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
}
