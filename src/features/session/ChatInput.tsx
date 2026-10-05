import { useState } from "react";
import type { ChatEventKind, ChatPayload, RollInfo } from "../../core/ipc/ipc";
import { RollDialog } from "./RollDialog";

interface AuthorOption {
  card_id: string | null;
  name: string;
}

interface Props {
  authors: AuthorOption[];
  defaultAuthorId: string | null;
  onSend: (kind: ChatEventKind, payload: ChatPayload) => void;
}

const KIND_LABELS: { kind: ChatEventKind; label: string; key: string }[] = [
  { kind: "chat.say", label: "说", key: "say" },
  { kind: "chat.action", label: "做", key: "action" },
  { kind: "chat.roll", label: "掷", key: "roll" },
  { kind: "chat.narration", label: "旁白", key: "narration" },
  { kind: "chat.ooc", label: "场外", key: "ooc" },
  { kind: "chat.whisper", label: "私聊", key: "whisper" },
];

export function ChatInput({ authors, defaultAuthorId, onSend }: Props) {
  const [authorId, setAuthorId] = useState<string | null>(defaultAuthorId);
  const [kind, setKind] = useState<ChatEventKind>("chat.say");
  const [text, setText] = useState("");
  const [rollOpen, setRollOpen] = useState(false);

  const currentAuthor = authors.find((a) => a.card_id === authorId) ??
    authors[0] ?? { card_id: null, name: "KP" };

  function send() {
    const content = text.trim();
    if (!content) return;

    if (content.startsWith("/roll ")) {
      const expr = content.slice(6).trim();
      const r = quickRoll(expr);
      if (r) {
        onSend("chat.roll", {
          author_card_id: currentAuthor.card_id,
          author_name: currentAuthor.name,
          content: expr,
          roll: r,
        });
        setText("");
        return;
      }
    }

    onSend(kind, {
      author_card_id: currentAuthor.card_id,
      author_name: currentAuthor.name,
      content,
    });
    setText("");
  }

  function handleRollResult(roll: RollInfo, note: string) {
    onSend("chat.roll", {
      author_card_id: currentAuthor.card_id,
      author_name: currentAuthor.name,
      content: note || roll.expr,
      roll,
    });
  }

  return (
    <>
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background: "var(--bg-panel)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <select
            className="select"
            value={authorId ?? ""}
            onChange={(e) => setAuthorId(e.target.value || null)}
            style={{ minWidth: 120, width: "auto" }}
          >
            {authors.length === 0 && <option value="">KP</option>}
            {authors.map((a) => (
              <option key={a.card_id ?? "kp"} value={a.card_id ?? ""}>
                {a.name}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 3 }}>
            {KIND_LABELS.map((k) => {
              const active = kind === k.kind && k.kind !== "chat.roll";
              return (
                <button
                  key={k.kind}
                  className="btn"
                  onClick={() => {
                    if (k.kind === "chat.roll") {
                      setRollOpen(true);
                    } else {
                      setKind(k.kind);
                    }
                  }}
                  style={{
                    padding: "4px 8px",
                    fontSize: 12,
                    background: active
                      ? "var(--bg-raised)"
                      : "var(--bg-surface)",
                    borderColor: active
                      ? "var(--accent-gold)"
                      : "var(--border-default)",
                    color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
                    fontWeight: active ? 600 : 400,
                  }}
                  title={k.label}
                >
                  {k.label}
                </button>
              );
            })}
          </div>

          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--fg-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            /roll 1d20
          </span>
        </div>

        <textarea
          className="textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={
            kind === "chat.narration"
              ? "描述场景……（Shift+Enter 换行）"
              : "输入消息……（Enter 发送，Shift+Enter 换行）"
          }
          style={{ minHeight: 60, resize: "vertical" }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button
            className="btn btn-primary"
            onClick={send}
            disabled={!text.trim()}
          >
            发送
          </button>
        </div>
      </div>

      {rollOpen && (
        <RollDialog
          onRoll={handleRollResult}
          onClose={() => setRollOpen(false)}
        />
      )}
    </>
  );
}

function quickRoll(expr: string): RollInfo | null {
  const trimmed = expr.trim().toLowerCase();
  const m = trimmed.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!m) {
    const n = Number(trimmed);
    if (Number.isNaN(n)) return null;
    return { expr: trimmed, result: n, detail: [n] };
  }
  const count = m[1] ? Number(m[1]) : 1;
  const face = Number(m[2]);
  const mod = m[3] ? Number(m[3]) : 0;
  if (count < 1 || count > 100 || face < 2 || face > 1000) return null;
  const detail: number[] = [];
  for (let i = 0; i < count; i++) {
    detail.push(Math.floor(Math.random() * face) + 1);
  }
  const sum = detail.reduce((a, b) => a + b, 0);
  return { expr: trimmed, result: sum + mod, detail };
}
