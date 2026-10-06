import { useEffect, useState } from "react";
import {
  type ChatPayload,
  type GameEvent,
  type RollInfo,
  isChatKind,
} from "../../core/ipc";
import { Modal } from "../../components/Modal";

interface Props {
  event: GameEvent;
  onSave: (payload: unknown, note?: string) => Promise<void>;
  onClose: () => void;
}

export function EventEditorDialog({ event, onSave, onClose }: Props) {
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [rollExpr, setRollExpr] = useState("");
  const [rollResult, setRollResult] = useState<number | "">("");
  const [rollDetail, setRollDetail] = useState("");
  const [note, setNote] = useState(event.note ?? "");
  const [saving, setSaving] = useState(false);

  const isChat = isChatKind(event.kind);
  const isRoll = event.kind === "chat.roll";
  const isNarration = event.kind === "chat.narration";
  const isSystem = !isChat;

  useEffect(() => {
    if (isChat) {
      const p = event.payload as ChatPayload;
      setAuthorName(p.author_name ?? "");
      setContent(p.content ?? "");
      if (p.roll) {
        setRollExpr(p.roll.expr ?? "");
        setRollResult(p.roll.result ?? "");
        setRollDetail((p.roll.detail ?? []).join(", "));
      }
    }
    setNote(event.note ?? "");
  }, [event, isChat]);

  async function handleSave() {
    setSaving(true);
    try {
      let payload: unknown;
      if (isChat) {
        const p: ChatPayload = {
          ...(event.payload as ChatPayload),
          author_name: isNarration ? undefined : authorName,
          content,
        };
        if (isRoll) {
          const detail = rollDetail
            .split(/[,\s]+/)
            .map((s) => Number(s))
            .filter((n) => !Number.isNaN(n));
          const r: RollInfo = {
            expr: rollExpr,
            result: Number(rollResult) || 0,
            detail,
          };
          p.roll = r;
        }
        payload = p;
      } else {
        payload = event.payload;
      }
      await onSave(payload, note.trim() ? note.trim() : undefined);
      onClose();
    } catch (e) {
      alert("保存失败: " + e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`编辑消息 #${event.seq}`}
      width={480}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </>
      }
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          fontFamily: "var(--font-mono)",
          marginBottom: 4,
        }}
      >
        {event.kind}
      </div>

      {isChat && !isNarration && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            发言者
          </span>
          <input
            className="input"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
        </label>
      )}

      {isChat && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            内容
          </span>
          <textarea
            className="textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ minHeight: 100, fontFamily: "inherit" }}
          />
        </label>
      )}

      {isRoll && (
        <>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 10,
                color: "var(--fg-muted)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              骰子表达式
            </span>
            <input
              className="input"
              value={rollExpr}
              onChange={(e) => setRollExpr(e.target.value)}
              placeholder="例如：1d20+3"
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </label>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                结果
              </span>
              <input
                className="input"
                type="number"
                value={rollResult}
                onChange={(e) =>
                  setRollResult(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                骰子明细（逗号分隔）
              </span>
              <input
                className="input"
                value={rollDetail}
                onChange={(e) => setRollDetail(e.target.value)}
                placeholder="例如：17, 3, 12"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </label>
          </div>
        </>
      )}

      {isSystem && (
        <div
          style={{
            padding: 8,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            fontSize: 11,
            color: "var(--fg-muted)",
            lineHeight: 1.6,
          }}
        >
          系统事件的 payload 暂不支持编辑。只能编辑备注或删除。
        </div>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          备注（可选）
        </span>
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </Modal>
  );
}
