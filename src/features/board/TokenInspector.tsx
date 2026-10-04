import { useEffect, useState } from "react";
import { ipc, type Board, type Token } from "../../core/ipc";
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
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
          名称覆盖
        </div>
        <input
          value={draft.name_override ?? ""}
          placeholder={linkedCard?.name ?? "（无）"}
          onChange={(e) => update({ name_override: e.target.value || null })}
          style={{ width: "100%", padding: "4px 6px", boxSizing: "border-box" }}
        />
        {linkedCard && (
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
            原卡：{linkedCard.name}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ fontSize: 12 }}>
          <div style={{ color: "#888", marginBottom: 2 }}>宽</div>
          <input
            type="number"
            value={draft.w ?? 80}
            onChange={(e) => update({ w: Number(e.target.value) || 80 })}
            style={{
              width: "100%",
              padding: "3px 6px",
              boxSizing: "border-box",
            }}
          />
        </label>
        <label style={{ fontSize: 12 }}>
          <div style={{ color: "#888", marginBottom: 2 }}>高</div>
          <input
            type="number"
            value={draft.h ?? 80}
            onChange={(e) => update({ h: Number(e.target.value) || 80 })}
            style={{
              width: "100%",
              padding: "3px 6px",
              boxSizing: "border-box",
            }}
          />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ fontSize: 12 }}>
          <div style={{ color: "#888", marginBottom: 2 }}>X</div>
          <input
            type="number"
            value={draft.x}
            onChange={(e) => update({ x: Number(e.target.value) || 0 })}
            style={{
              width: "100%",
              padding: "3px 6px",
              boxSizing: "border-box",
            }}
          />
        </label>
        <label style={{ fontSize: 12 }}>
          <div style={{ color: "#888", marginBottom: 2 }}>Y</div>
          <input
            type="number"
            value={draft.y}
            onChange={(e) => update({ y: Number(e.target.value) || 0 })}
            style={{
              width: "100%",
              padding: "3px 6px",
              boxSizing: "border-box",
            }}
          />
        </label>
      </div>

      <label style={{ fontSize: 12 }}>
        <div style={{ color: "#888", marginBottom: 2 }}>层级</div>
        <input
          type="number"
          value={draft.layer}
          onChange={(e) => update({ layer: Number(e.target.value) || 0 })}
          style={{ width: "100%", padding: "3px 6px", boxSizing: "border-box" }}
        />
      </label>

      <label
        style={{
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <input
          type="checkbox"
          checked={draft.visible}
          onChange={(e) => update({ visible: e.target.checked })}
        />
        可见
      </label>

      <div style={{ fontSize: 11, color: "#aaa" }}>
        Token ID: {token.id.slice(0, 8)}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={!dirty}>
          {dirty ? "保存" : "已保存"}
        </button>
        <button
          onClick={handleDelete}
          style={{ marginLeft: "auto", color: "#c33" }}
        >
          删除
        </button>
      </div>
    </div>
  );
}
