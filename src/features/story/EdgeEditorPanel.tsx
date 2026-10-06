import { useMemo } from "react";
import {
  ipc,
  type Relation,
  type RelationKind,
  type Scenario,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useDraft } from "../../hooks/useDraft";
import { parseEffects, validateEffects } from "./effects";
import { useDeleteUndo } from "../../hooks/useDeleteUndo";

interface Props {
  relation: Relation;
  scenario: Scenario | null;
}

export function EdgeEditorPanel({ relation, scenario }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const upsertRelation = useProjectStore((s) => s.upsertRelation);
  const removeRelation = useProjectStore((s) => s.removeRelation);
  const selectEdge = useProjectStore((s) => s.selectEdge);

  const { draft, dirty, update, commit } = useDraft(
    relation,
    async (d): Promise<void | boolean> => {
      // 效果校验
      if (scenario) {
        const effects = Array.isArray(d.meta?.effects)
          ? (d.meta.effects as unknown[]).map((e) => String(e))
          : [];
        const errors = validateEffects(effects, scenario.variables);
        if (errors.length > 0) {
          return false;
        }
      }
      await ipc.upsertRelation(d);
      upsertRelation(d);
    },
    {
      undoLabel: "编辑关系",
      onDraftChange: (d) => {
        upsertRelation(d);
      },
    },
  );

  const availableKinds: RelationKind[] = useMemo(() => {
    if (scenario && scenario.edge_kinds.length > 0) {
      return relationKinds.filter((k) => scenario.edge_kinds.includes(k.id));
    }
    return relationKinds;
  }, [relationKinds, scenario]);

  const condition =
    typeof draft.meta?.condition === "string" ? draft.meta.condition : "";

  const effects: string[] = useMemo(() => {
    const raw = draft.meta?.effects;
    if (Array.isArray(raw)) return raw.map((e) => String(e));
    return [];
  }, [draft.meta]);

  const effectErrors = useMemo(
    () => (scenario ? validateEffects(effects, scenario.variables) : []),
    [effects, scenario],
  );

  const sourceCard = cards.find((c) => c.id === draft.from);
  const targetCard = cards.find((c) => c.id === draft.to);

  const currentKind = relationKinds.find((k) => k.id === draft.kind);

  function setCondition(next: string) {
    update({ meta: { ...draft.meta, condition: next } });
  }

  function setEffects(next: string[]) {
    update({ meta: { ...draft.meta, effects: next } });
  }

  const deleteWithUndo = useDeleteUndo();

  async function handleDelete() {
    if (!confirm("删除这条关系？可用 Ctrl+Z 撤销。")) return;
    const snapshot = { ...draft };
    try {
      await deleteWithUndo({
        label: "删除剧情关系",
        do: async () => {
          await ipc.deleteRelation(snapshot.from, snapshot.id);
          removeRelation(snapshot.id);
          selectEdge(null);
        },
        restore: async () => {
          await ipc.upsertRelation(snapshot);
          upsertRelation(snapshot);
        },
      });
    } catch (e) {
      alert("删除失败: " + e);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 源 → 目标 */}
      <div
        style={{
          padding: 8,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          从 → 到
        </div>
        <div style={{ color: "var(--fg-primary)" }}>
          <span
            style={{ cursor: "pointer", color: "var(--accent-gold)" }}
            onClick={() =>
              sourceCard && useProjectStore.getState().selectCard(sourceCard.id)
            }
          >
            {sourceCard?.name ?? draft.from.slice(0, 8)}
          </span>
          <span style={{ color: "var(--fg-muted)", margin: "0 6px" }}>→</span>
          <span
            style={{ cursor: "pointer", color: "var(--accent-gold)" }}
            onClick={() =>
              targetCard && useProjectStore.getState().selectCard(targetCard.id)
            }
          >
            {targetCard?.name ?? draft.to.slice(0, 8)}
          </span>
        </div>
        {currentKind?.inverse_name && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "var(--fg-muted)",
              fontStyle: "italic",
            }}
          >
            （在 {targetCard?.name ?? "目标"} 的视角：{currentKind.inverse_name}
            ）
          </div>
        )}
      </div>

      <LabeledBlock label="关系类型">
        <select
          className="select"
          value={draft.kind}
          onChange={(e) => update({ kind: e.target.value })}
        >
          {availableKinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </LabeledBlock>

      <LabeledBlock label="备注（可选）">
        <input
          className="input"
          value={draft.label ?? ""}
          onChange={(e) => update({ label: e.target.value || null })}
          placeholder="例如：去酒馆打听"
        />
      </LabeledBlock>

      {scenario && (
        <>
          <LabeledBlock label="条件表达式">
            <textarea
              className="textarea"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="例如：visited_tavern == true"
              style={{ minHeight: 50, fontFamily: "var(--font-mono)" }}
            />
            <div
              style={{
                fontSize: 11,
                color: "var(--fg-muted)",
                marginTop: 4,
              }}
            >
              留空表示无条件。
            </div>
          </LabeledBlock>

          <LabeledBlock
            label={`效果（走这条边时改变量）${
              effectErrors.length > 0 ? ` — ${effectErrors.length} 个错误` : ""
            }`}
          >
            {scenario.variables.length > 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  marginBottom: 6,
                  fontFamily: "var(--font-mono)",
                }}
              >
                可用：{scenario.variables.map((v) => v.key).join(" · ")}
              </div>
            )}
            {effects.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                无效果
              </div>
            )}
            {effects.map((e, i) => {
              const err = validateEffects([e], scenario.variables);
              const hasErr = err.length > 0 && e.trim().length > 0;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 4,
                    marginBottom: 4,
                    alignItems: "center",
                  }}
                >
                  <input
                    className="input"
                    value={e}
                    onChange={(ev) => {
                      const next = [...effects];
                      next[i] = ev.target.value;
                      setEffects(next);
                    }}
                    placeholder="例如：gold -= 5"
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      borderColor: hasErr ? "var(--danger)" : undefined,
                    }}
                  />
                  <button
                    className="btn btn-ghost"
                    onClick={() =>
                      setEffects(effects.filter((_, idx) => idx !== i))
                    }
                    style={{
                      color: "var(--danger)",
                      padding: "1px 6px",
                      fontSize: 12,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button
              className="btn"
              onClick={() => setEffects([...effects, ""])}
              style={{ fontSize: 11, marginTop: 4 }}
            >
              + 效果
            </button>
            {effectErrors.length > 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--danger)",
                  marginTop: 4,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {effectErrors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}
          </LabeledBlock>
        </>
      )}

      {!scenario && (
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            padding: 8,
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          这是世界观关系。条件和效果只在剧情图中编辑。
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          paddingTop: 8,
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: dirty ? "var(--warning)" : "var(--fg-muted)",
          }}
        >
          {dirty ? "保存中…" : "已保存"}
        </span>
        <button
          className="btn"
          onClick={commit}
          disabled={!dirty || effectErrors.length > 0}
          style={{ fontSize: 11 }}
        >
          保存
        </button>
        <button
          className="btn btn-danger"
          onClick={handleDelete}
          style={{ marginLeft: "auto" }}
        >
          删除
        </button>
      </div>

      <details style={{ fontSize: 11, color: "var(--fg-muted)" }}>
        <summary>原始数据</summary>
        <pre
          style={{
            overflow: "auto",
            maxHeight: 200,
            fontFamily: "var(--font-mono)",
          }}
        >
          {JSON.stringify(draft, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function LabeledBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
