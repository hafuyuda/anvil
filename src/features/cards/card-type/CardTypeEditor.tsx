import { useState } from "react";
import { useProjectStore } from "../../../stores/projectStore";
import { ipc, type CardType, type FieldDef } from "../../../core/ipc";
import { useDraft } from "../../../hooks/useDraft";
import { nowMs } from "../../../lib/time";
import { FieldList } from "./FieldList";
import { CardFrameEditor } from "./CardFrameEditor";

interface Props {
  cardType: CardType;
}

export function CardTypeEditor({ cardType }: Props) {
  const upsertCardType = useProjectStore((s) => s.upsertCardType);

  const { draft, dirty, update, commit } = useDraft(
    cardType,
    async (d): Promise<void | boolean> => {
      const visible = d.fields.filter((f) => !f.deprecated);

      if (visible.some((f) => !f.key.trim())) {
        alert("字段 key 不能为空");
        return false;
      }
      const keys = visible.map((f) => f.key);
      const dup = keys.find((k, i) => keys.indexOf(k) !== i);
      if (dup) {
        alert(`字段 key 重复：${dup}`);
        return false;
      }
      const bad = visible.find((f) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.key));
      if (bad) {
        alert(
          `字段 key 格式不合法：${bad.key}（只允许字母、数字、下划线，字母开头）`,
        );
        return false;
      }

      const next: CardType = { ...d, updated_at: nowMs() };
      await ipc.upsertCardType(next);
      upsertCardType(next);
    },
    {
      undoLabel: "编辑卡牌类型",
      autoSave: false,
      onDraftChange: (d) => {
        upsertCardType({ ...d, updated_at: nowMs() });
      },
    },
  );

  const [tab, setTab] = useState<"fields" | "frame">("fields");

  function updateField(index: number, patch: Partial<FieldDef>) {
    const fields = draft.fields.map((f, i) =>
      i === index ? { ...f, ...patch } : f,
    );
    update({ fields });
  }

  function addField() {
    const key = `field_${nowMs().toString(36)}`;
    const field: FieldDef = {
      key,
      label: "新字段",
      ty: { kind: "text" },
      required: false,
      order: draft.fields.length,
      deprecated: false,
    };
    update({ fields: [...draft.fields, field] });
  }

  function removeField(index: number) {
    if (!confirm("确认删除该字段？已有数据会保留但不显示。")) return;
    update({
      fields: draft.fields.map((f, i) =>
        i === index ? { ...f, deprecated: true } : f,
      ),
    });
  }

  function reorderFields(newFields: FieldDef[]) {
    update({ fields: newFields });
  }

  const visibleFields = draft.fields.filter((f) => !f.deprecated);
  const hasFrame = Boolean(draft.card_frame);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 顶部 */}
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <input
          className="input"
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          style={{
            flex: 1,
            fontSize: 16,
            fontFamily: "var(--font-title)",
            fontWeight: 600,
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: dirty ? "var(--warning)" : "var(--fg-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {dirty ? "有未保存修改" : "已保存"}
        </span>
        <button className="btn" onClick={commit} disabled={!dirty}>
          保存
        </button>
      </div>

      {/* tab */}
      <div
        style={{
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <TabButton active={tab === "fields"} onClick={() => setTab("fields")}>
          字段（{visibleFields.length}）
        </TabButton>
        <TabButton active={tab === "frame"} onClick={() => setTab("frame")}>
          卡框
          {hasFrame && (
            <span
              style={{
                marginLeft: 4,
                color: "var(--accent-gold)",
                fontSize: 10,
              }}
            >
              ●
            </span>
          )}
        </TabButton>
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16 }}>
        {tab === "fields" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                描述
              </div>
              <input
                className="input"
                value={draft.description ?? ""}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="类型描述"
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>字段</span>
                <span
                  style={{
                    textTransform: "none",
                    letterSpacing: 0,
                    fontSize: 10,
                  }}
                >
                  拖动左侧 ⋮⋮ 排序
                </span>
              </div>

              <FieldList
                allFields={draft.fields}
                onUpdate={updateField}
                onRemove={removeField}
                onReorder={reorderFields}
              />

              <button
                className="btn"
                onClick={addField}
                style={{ marginTop: 8, fontSize: 12 }}
              >
                + 加字段
              </button>
            </div>

            {draft.fields.some((f) => f.deprecated) && (
              <details style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                <summary>已废弃字段（数据保留）</summary>
                <ul>
                  {draft.fields
                    .filter((f) => f.deprecated)
                    .map((f) => (
                      <li key={f.key}>
                        {f.label}（{f.key}）
                      </li>
                    ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {tab === "frame" && (
          <CardFrameEditor
            cardType={draft}
            onChange={(card_frame) => update({ card_frame })}
            onChangeColor={(color) => update({ color })}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-ghost"
      onClick={onClick}
      style={{
        fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        borderBottom: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
      }}
    >
      {children}
    </button>
  );
}
