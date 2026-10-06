import { useEffect, useState } from "react";
import { type Token } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { ScaledCardFrame } from "../../components/ScaledCardFrame";

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
  const setWorldSubView = useProjectStore((s) => s.setWorldSubView);

  const [draft, setDraft] = useState<Token>(token);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(token);
    setDirty(false);
  }, [
    token.id,
    token.x,
    token.y,
    token.name_override,
    token.w,
    token.h,
    token.rotation,
    token.layer,
    token.visible,
  ]);

  function update(patch: Partial<Token>) {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  }

  async function save() {
    await onSave(draft);
    setDirty(false);
  }

  async function handleDelete() {
    if (!confirm("删除该 Token？原始卡牌不受影响。")) return;
    await onDelete();
    onClose();
  }

  function jumpToCard() {
    if (!linkedCard) return;
    setActiveModule("world");
    setWorldSubView("cards");
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
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <LabeledInput
              label="宽"
              type="number"
              value={String(draft.w ?? 140)}
              onChange={(v) => update({ w: Number(v) || 140 })}
            />
            <LabeledInput
              label="高"
              type="number"
              value={String(draft.h ?? 205)}
              onChange={(v) => update({ h: Number(v) || 205 })}
            />
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
