import { useEffect, useState } from "react";
import { type Token } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { ScaledCardFrame } from "../../components/ScaledCardFrame";
import { useDeleteUndo } from "../../hooks/useDeleteUndo";
import { confirmDialog } from "../../lib/confirm";

interface Props {
  token: Token;
  onSave: (updated: Token) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onClose: () => void;
}

function normalizeForSlider(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function TokenInspector({ token, onSave, onDelete, onClose }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const selectCard = useProjectStore((s) => s.selectCard);
  const setActiveModule = useProjectStore((s) => s.setActiveModule);

  const [draft, setDraft] = useState<Token>(token);
  const [dirty, setDirty] = useState(false);
  const [aspectLocked, setAspectLocked] = useState(false);

  // token 切换 → 完全重置 draft
  useEffect(() => {
    setDraft(token);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token.id]);

  // 外部变化 → 仅在用户未编辑时同步
  useEffect(() => {
    if (dirty) return;
    setDraft(token);
  }, [token, dirty]);

  function update(patch: Partial<Token>) {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  }

  function setWidth(v: number) {
    if (!aspectLocked) {
      update({ w: v });
      return;
    }
    const curW = draft.w ?? 140;
    const curH = draft.h ?? 205;
    const ratio = curH / curW;
    update({ w: v, h: Math.round(v * ratio) });
  }

  function setHeight(v: number) {
    if (!aspectLocked) {
      update({ h: v });
      return;
    }
    const curW = draft.w ?? 140;
    const curH = draft.h ?? 205;
    const ratio = curW / curH;
    update({ h: v, w: Math.round(v * ratio) });
  }

  async function save() {
    await onSave(draft);
    setDirty(false);
  }

  const deleteWithUndo = useDeleteUndo();

  async function handleDelete() {
    if (
      !(await confirmDialog({
        message: "删除该 Token？可用 Ctrl+Z 撤销。",
        confirmLabel: "删除",
        danger: true,
      }))
    )
      return;
    await deleteWithUndo({
      label: "删除 Token",
      do: async () => {
        await onDelete();
        onClose();
      },
      restore: async () => {
        await onSave(token);
      },
    });
  }

  function jumpToCard() {
    if (!linkedCard) return;
    setActiveModule("world");
    selectCard(linkedCard.id);
  }

  const linkedCard = token.card_id
    ? (cards.find((c) => c.id === token.card_id) ?? null)
    : null;
  const linkedCardType = linkedCard
    ? (cardTypes.find((t) => t.id === linkedCard.type_id) ?? null)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {linkedCard && linkedCardType ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ScaledCardFrame
            card={linkedCard}
            cardType={linkedCardType}
            baseSize="small"
            minScale={1}
            maxScale={2}
          />
          <button
            className="btn btn-ghost"
            onClick={jumpToCard}
            style={{ fontSize: 11 }}
          >
            {linkedCard.name} · 查看卡片
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: 12,
            border: "1px dashed var(--border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--fg-muted)",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          未关联卡牌
          <br />
          纯装饰 Token
        </div>
      )}

      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: 10,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          Token 调整
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <LabeledInput
            label="名称覆盖"
            value={draft.name_override ?? ""}
            onChange={(v) => update({ name_override: v || null })}
            placeholder={linkedCard?.name ?? "（使用卡片名）"}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 8,
              alignItems: "end",
            }}
          >
            <LabeledInput
              label="宽"
              type="number"
              value={String(draft.w ?? 140)}
              onChange={(v) => setWidth(Number(v) || 140)}
            />
            <LabeledInput
              label="高"
              type="number"
              value={String(draft.h ?? 205)}
              onChange={(v) => setHeight(Number(v) || 205)}
            />
            <button
              className="btn btn-icon"
              onClick={() => setAspectLocked((v) => !v)}
              title={aspectLocked ? "解除宽高比锁定" : "锁定宽高比"}
              style={{
                height: 26,
                fontSize: 12,
                padding: "0 8px",
                background: aspectLocked
                  ? "var(--bg-raised)"
                  : "var(--bg-surface)",
                borderColor: aspectLocked
                  ? "var(--accent-gold)"
                  : "var(--border-default)",
                color: aspectLocked ? "var(--accent-gold)" : "var(--fg-muted)",
              }}
            >
              {aspectLocked ? "🔒" : "🔓"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <LabeledInput
              label="X"
              type="number"
              value={String(draft.x)}
              onChange={(v) => update({ x: Number(v) || 0 })}
            />
            <LabeledInput
              label="Y"
              type="number"
              value={String(draft.y)}
              onChange={(v) => update({ y: Number(v) || 0 })}
            />
          </div>

          {/* 旋转 */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  color: "var(--fg-muted)",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                旋转
              </span>
              <button
                className="btn btn-ghost"
                onClick={() => update({ rotation: 0 })}
                style={{ fontSize: 10, padding: "1px 6px" }}
                title="重置为 0°"
              >
                重置
              </button>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={normalizeForSlider(draft.rotation)}
                onChange={(e) => update({ rotation: Number(e.target.value) })}
                style={{
                  flex: 1,
                  accentColor: "var(--accent-gold)",
                }}
              />
              <input
                className="input"
                type="number"
                value={Math.round(draft.rotation)}
                onChange={(e) =>
                  update({ rotation: Number(e.target.value) || 0 })
                }
                style={{
                  width: 64,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
              />
              <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>°</span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-muted)",
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              棋盘上按住 Alt 拖拽 token 可旋转，按住 Shift 吸附 15°
            </div>
          </div>

          <LabeledInput
            label="层级"
            type="number"
            value={String(draft.layer)}
            onChange={(v) => update({ layer: Number(v) || 0 })}
          />

          <label
            style={{
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--fg-secondary)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={draft.visible}
              onChange={(e) => update({ visible: e.target.checked })}
              style={{ accentColor: "var(--accent-gold)" }}
            />
            可见
            <input
              type="checkbox"
              checked={draft.face_down === true}
              onChange={(e) => update({ face_down: e.target.checked })}
              style={{ accentColor: "var(--accent-gold)" }}
            />
            扣着（显示卡背）
          </label>

          <div
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Token {token.id.slice(0, 8)}
          </div>

          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button className="btn" onClick={save} disabled={!dirty}>
              {dirty ? "保存" : "已保存"}
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              style={{ marginLeft: "auto" }}
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: "text" | "number";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label
      style={{
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <span style={{ color: "var(--fg-muted)" }}>{label}</span>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
