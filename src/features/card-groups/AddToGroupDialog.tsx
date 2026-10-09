import { useState } from "react";
import { ipc, type CardGroup } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { Modal } from "../../components/Modal";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";
import { toast } from "../../lib/toast";
import { runWithError } from "../../lib/runWithError";

interface Props {
  cardIds: string[];
  onClose: () => void;
  onDone: (groupName: string, added: number) => void;
}

export function AddToGroupDialog({ cardIds, onClose, onDone }: Props) {
  const cardGroups = useProjectStore((s) => s.cardGroups) ?? [];
  const upsertCardGroup = useProjectStore((s) => s.upsertCardGroup);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  async function addToExisting(group: CardGroup) {
    if (busy) return;
    setBusy(true);
    try {
      const existing = new Set(group.card_ids);
      const toAdd = cardIds.filter((id) => !existing.has(id));
      if (toAdd.length === 0) {
        toast.info(`这批卡已全部在「${group.name}」里了。`);
        onClose();
        return;
      }
      const next: CardGroup = {
        ...group,
        card_ids: [...group.card_ids, ...toAdd],
        updated_at: nowMs(),
      };
      await runWithError(async () => {
        await ipc.upsertCardGroup(next);
        upsertCardGroup(next);
        onDone(group.name, toAdd.length);
      }, "加入卡组失败");
    } finally {
      setBusy(false);
    }
  }

  async function createAndAdd() {
    const name = newName.trim();
    if (!name) {
      toast.info("卡组名不能为空");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const now = nowMs();
      const g: CardGroup = {
        id: newId(),
        name,
        description: null,
        card_ids: [...cardIds],
        created_at: now,
        updated_at: now,
      };
      await runWithError(async () => {
        await ipc.upsertCardGroup(g);
        upsertCardGroup(g);
        onDone(name, cardIds.length);
      }, "新建卡组失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`将 ${cardIds.length} 张卡加入卡组`}
      width={420}
      onClose={onClose}
      footer={
        creating ? (
          <>
            <button
              className="btn"
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
              disabled={busy}
            >
              返回
            </button>
            <button
              className="btn btn-primary"
              onClick={createAndAdd}
              disabled={busy || !newName.trim()}
            >
              {busy ? "创建中…" : "创建并加入"}
            </button>
          </>
        ) : (
          <>
            <button className="btn" onClick={onClose} disabled={busy}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setCreating(true)}
              disabled={busy}
            >
              + 新建卡组
            </button>
          </>
        )
      }
    >
      {creating ? (
        <label
          style={{
            fontSize: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ color: "var(--fg-muted)" }}>新卡组名</span>
          <input
            className="input"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void createAndAdd();
            }}
            placeholder="例如：北境 NPC"
          />
          <span
            style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}
          >
            将 {cardIds.length} 张卡加入新卡组。
          </span>
        </label>
      ) : (
        <>
          {cardGroups.length === 0 && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--fg-muted)",
                fontSize: 12,
                border: "1px dashed var(--border-default)",
                borderRadius: "var(--radius-md)",
              }}
            >
              还没有卡组。点「+ 新建卡组」创建一个。
            </div>
          )}

          {cardGroups.length > 0 && (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {cardGroups.map((g, i) => {
                const existing = new Set(g.card_ids);
                const dupCount = cardIds.filter((id) =>
                  existing.has(id),
                ).length;
                const newCount = cardIds.length - dupCount;
                return (
                  <li
                    key={g.id}
                    onClick={() => void addToExisting(g)}
                    style={{
                      padding: "10px 14px",
                      cursor: busy ? "not-allowed" : "pointer",
                      borderBottom:
                        i < cardGroups.length - 1
                          ? "1px solid var(--border-subtle)"
                          : "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      opacity: busy ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!busy)
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--bg-raised)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "";
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--fg-primary)",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {g.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--fg-muted)",
                          marginTop: 2,
                        }}
                      >
                        现有 {g.card_ids.length} 张
                        {dupCount > 0 && (
                          <>
                            {" · "}
                            <span style={{ color: "var(--warning)" }}>
                              {dupCount} 张已在该组
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color:
                          newCount > 0
                            ? "var(--accent-gold)"
                            : "var(--fg-muted)",
                        fontFamily: "var(--font-mono)",
                        flexShrink: 0,
                      }}
                    >
                      {newCount > 0 ? `+${newCount}` : "已满"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}
