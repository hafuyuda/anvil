import { useState } from "react";
import type {
  ChatEventKind,
  ChatPayload,
  EventVisibility,
  SessionViewMode,
} from "../../../core/ipc";
import { rollDice } from "../../../lib/dice";
import { RollDialog } from "./RollDialog";
import type { RuleSetId } from "../ruleset";

interface AuthorOption {
  card_id: string | null;
  name: string;
}

interface Props {
  authors: AuthorOption[];
  defaultAuthorId: string | null;
  ruleSet: RuleSetId;
  /** 玩家视图下输入仍可用 —— 视图是呈现过滤器，不是权限。 */
  view: SessionViewMode;
  onSend: (
    kind: ChatEventKind,
    payload: ChatPayload,
    visibility: EventVisibility,
  ) => void;
}

const KIND_LABELS: { kind: ChatEventKind; label: string }[] = [
  { kind: "chat.say", label: "说" },
  { kind: "chat.action", label: "做" },
  { kind: "chat.roll", label: "掷" },
  { kind: "chat.narration", label: "旁白" },
  { kind: "chat.ooc", label: "场外" },
  { kind: "chat.whisper", label: "私聊" },
];

export function ChatInput({
  authors,
  defaultAuthorId,
  ruleSet,
  view,
  onSend,
}: Props) {
  const [authorId, setAuthorId] = useState<string | null>(defaultAuthorId);
  const [kind, setKind] = useState<ChatEventKind>("chat.say");
  const [text, setText] = useState("");
  const [secret, setSecret] = useState(false);
  const [rollOpen, setRollOpen] = useState(false);

  const currentAuthor = authors.find((a) => a.card_id === authorId) ??
    authors[0] ?? { card_id: null, name: "KP" };

  const visibility: EventVisibility = secret ? "secret" : "public";

  function send() {
    const content = text.trim();
    if (!content) return;

    if (content.startsWith("/roll ")) {
      const expr = content.slice(6).trim();
      const r = rollDice(expr);
      if (r) {
        onSend(
          "chat.roll",
          {
            author_card_id: currentAuthor.card_id,
            author_name: currentAuthor.name,
            content: r.expr,
            roll: {
              expr: r.expr,
              result: r.result,
              detail: r.detail,
              dropped: r.dropped,
              natural: r.natural,
              rule_set: ruleSet,
            },
          },
          visibility,
        );
        setText("");
        return;
      }
    }

    onSend(
      kind,
      {
        author_card_id: currentAuthor.card_id,
        author_name: currentAuthor.name,
        content,
      },
      visibility,
    );
    setText("");
  }

  function handleRollResult(
    roll: Parameters<typeof onSend>[1]["roll"],
    note: string,
    isSecret: boolean,
  ) {
    if (!roll) return;
    onSend(
      "chat.roll",
      {
        author_card_id: currentAuthor.card_id,
        author_name: currentAuthor.name,
        content: note || roll.expr,
        roll,
      },
      isSecret ? "secret" : "public",
    );
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
          background: secret ? "var(--chat-secret-input-bg)" : "var(--bg-panel)",
          flexShrink: 0,
          transition: "background 0.12s",
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

          <button
            className="btn"
            onClick={() => setSecret((v) => !v)}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              background: secret
                ? "var(--chat-secret-bg)"
                : "var(--bg-surface)",
              borderColor: secret
                ? "var(--chat-secret-border)"
                : "var(--border-default)",
              color: secret
                ? "var(--chat-secret-text)"
                : "var(--fg-secondary)",
              borderStyle: secret ? "dashed" : "solid",
              fontWeight: secret ? 600 : 400,
            }}
            title={
              secret
                ? "秘密：只有 KP 视图能看到，可随时揭示"
                : "公开：所有人都能看到"
            }
          >
            {secret ? "秘密" : "公开"}
          </button>

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
            secret
              ? "秘密内容……（只有 KP 视图可见）"
              : kind === "chat.narration"
                ? "描述场景……（Shift+Enter 换行）"
                : "输入消息……（Enter 发送，Shift+Enter 换行）"
          }
          style={{ minHeight: 60, resize: "vertical" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            {view === "player"
              ? "当前是玩家视图，发出的内容玩家可见"
              : secret
                ? "这条消息只有 KP 视图可见"
                : "这条消息所有人可见"}
          </span>
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
          ruleSet={ruleSet}
          defaultSecret={secret}
          onRoll={handleRollResult}
          onClose={() => setRollOpen(false)}
        />
      )}
    </>
  );
}
