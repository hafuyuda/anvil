import { useState } from "react";
import type { ChatEventKind, ChatPayload } from "../../../core/ipc";
import { rollDice } from "../../../lib/dice";
import { RollDialog } from "./RollDialog";

interface AuthorOption {
  card_id: string | null;
  name: string;
}

interface Props {
  authors: AuthorOption[];
  onSend: (kind: ChatEventKind, payload: ChatPayload) => void;
}

const KIND_LABELS: { kind: ChatEventKind; label: string }[] = [
  { kind: "chat.say", label: "说" },
  { kind: "chat.action", label: "做" },
  { kind: "chat.roll", label: "掷" },
  { kind: "chat.narration", label: "旁白" },
  { kind: "chat.ooc", label: "场外" },
  { kind: "chat.whisper", label: "私聊" },
];

export function ChatInput({ authors, onSend }: Props) {
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [kind, setKind] = useState<ChatEventKind>("chat.say");
  const [text, setText] = useState("");
  const [rollOpen, setRollOpen] = useState(false);

  const currentAuthor =
    authors.find((a) => a.card_id === authorId) ??
    authors[0] ?? { card_id: null, name: "KP" };

  function send() {
    const content = text.trim();
    if (!content) return;

    if (content.startsWith("/roll ")) {
      const expr = content.slice(6).trim();
      const r = rollDice(expr);
      if (r) {
        onSend("chat.roll", {
          author_card_id: currentAuthor.card_id,
          author_name: currentAuthor.name,
          content: r.expr,
          roll: {
            expr: r.expr,
            result: r.result,
            detail: r.detail,
            dropped: r.dropped,
          },
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

  function handleRollResult(
    roll: Parameters<typeof onSend>[1]["roll"],
    note: string,
  ) {
    if (!roll) return;
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
              // 「掷」是即时动作按钮，不是可驻留的消息种类
              if (k.kind === "chat.roll") {
                return (
                  <button
                    key={k.kind}
                    className="btn"
                    onClick={() => setRollOpen(true)}
                    style={{
                      padding: "4px 8px",
                      fontSize: 12,
                      background: "var(--bg-surface)",
                      borderColor: "var(--border-default)",
                      color: "var(--fg-secondary)",
                    }}
                    title="打开掷骰面板"
                  >
                    {k.label}
                  </button>
                );
              }
              const active = kind === k.kind;
              return (
                <button
                  key={k.kind}
                  className="btn"
                  onClick={() => setKind(k.kind)}
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

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
