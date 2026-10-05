import { useEffect, useState } from "react";
import { ipc, type Board, type Token } from "../../core/ipc/ipc";
import { useProjectStore } from "../../stores/projectStore";

interface Props {
  board: Board;
  token: Token;
}

export function TokenInspector({ board, token }: Props) {
  const upsertBoard = useProjectStore((s) => s.upsertBoard);
  const cards = useProjectStore((s) => s.cards) ?? [];
  const selectToken = useProjectStore((s) => s.selectToken);

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
    token.layer,
    token.visible,
  ]);

  function update(patch: Partial<Token>) {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  }

  async function save() {
    const nextTokens = (board.tokens ?? []).map((t) =>
      t.id === draft.id ? draft : t,
    );
    const next: Board = {
      ...board,
      tokens: nextTokens,
      updated_at: Date.now(),
    };
    await ipc.upsertBoard(next);
    upsertBoard(next);
    setDirty(false);
  }

  async function handleDelete() {
    if (!confirm("删除该 Token？原始卡牌不受影响。")) return;
    const nextTokens = (board.tokens ?? []).filter((t) => t.id !== draft.id);
    const next: Board = {
      ...board,
      tokens: nextTokens,
      updated_at: Date.now(),
    };
    await ipc.upsertBoard(next);
    upsertBoard(next);
    selectToken(null);
  }

  const linkedCard = token.card_id
    ? cards.find((c) => c.id === token.card_id)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          名称覆盖
        </div>
        <input
          className="input"
          value={draft.name_override ?? ""}
          placeholder={linkedCard?.name ?? "（无）"}
          onChange={(e) => update({ name_override: e.target.value || null })}
        />
        {linkedCard && (
          <div
            style={{
              fontSize: 11,
              color: "var(--fg-muted)",
              marginTop: 2,
            }}
          >
            原卡：{linkedCard.name}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <LabeledInput
          label="宽"
          type="number"
          value={draft.w ?? 80}
          onChange={(v) => update({ w: Number(v) || 80 })}
        />
        <LabeledInput
          label="高"
          type="number"
          value={draft.h ?? 80}
          onChange={(v) => update({ h: Number(v) || 80 })}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <LabeledInput
          label="X"
          type="number"
          value={draft.x}
          onChange={(v) => update({ x: Number(v) || 0 })}
        />
        <LabeledInput
          label="Y"
          type="number"
          value={draft.y}
          onChange={(v) => update({ y: Number(v) || 0 })}
        />
      </div>

      <LabeledInput
        label="层级"
        type="number"
        value={draft.layer}
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
          fontSize: 11,
          color: "var(--fg-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        Token ID: {token.id.slice(0, 8)}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
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
  );
}

function LabeledInput({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: "number" | "text";
  value: string | number;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ fontSize: 12 }}>
      <div
        style={{
          color: "var(--fg-muted)",
          marginBottom: 3,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          fontSize: 11,
        }}
      >
        {label}
      </div>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
