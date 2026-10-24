import { useState } from "react";
import { ipc, type Card, type CardType } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { useDraft } from "../../../hooks/useDraft";
import { FieldInput } from "../../../components/field/FieldInput";
import { RelationsPanel } from "./RelationsPanel";
import { CardDocEditor } from "./CardDocEditor";
import { DocFieldSummary } from "./DocFieldSummary";
import { nowMs } from "../../../lib/time";
import { useDeleteUndo } from "../../../hooks/useDeleteUndo";
import { CropEditor } from "../card-type/CropEditor";
import { confirmRefAwareDelete } from "../../../lib/refAwareDelete";
import { reloadIntoStore } from "../../../core/actions/reloadIntoStore";
import {
  captureCardFootprint,
  restoreCardFootprint,
} from "../../../core/actions/entityUndo";
import { runWithError } from "../../../lib/runWithError";

interface Props {
  card: Card;
  cardType: CardType;
}

export function CardEditor({ card, cardType }: Props) {
  const updateCard = useProjectStore((s) => s.updateCard);
  const setActiveModule = useProjectStore((s) => s.setActiveModule);
  const [tab, setTab] = useState<"fields" | "doc">("fields");

  const { draft, dirty, update, commit } = useDraft(
    card,
    async (d): Promise<void> => {
      const next: Card = { ...d, updated_at: nowMs() };
      await ipc.saveCard(next);
      updateCard(next);
    },
    {
      undoLabel: "编辑卡牌",
      // 角色面板会往同一张卡写 HP。撤销时按键合并，
      // 不把用户之后改的 HP 一起吞掉
      resolveCurrent: () =>
        useProjectStore.getState().cards.find((c) => c.id === card.id) ?? null,
      onDraftChange: (d) => {
        updateCard({ ...d, updated_at: nowMs() });
      },
    },
  );

  const deleteWithUndo = useDeleteUndo();

  async function handleDelete() {
    const clearMode = await confirmRefAwareDelete([
      { kind: "card", id: card.id, name: card.name },
    ]);
    if (!clearMode) return;
    // 删除前采集关系网足迹 —— 后端会连带摘掉棋子、卡盒、先攻、关系、
    // 卡组成员，撤销时要把这些都按原位置放回去
    const footprint = captureCardFootprint(card.id);
    await runWithError(
      () =>
        deleteWithUndo({
          label: "删除卡牌",
          do: async () => {
            await ipc.deleteCard(card.id, clearMode);
            // 卡没了，编辑器也没东西可编辑了
            useProjectStore.getState().selectCard(null);
            // 后端连带摘了棋子、卡盒、关系、卡组成员，store 要整体跟上
            await reloadIntoStore();
          },
          restore: async () => {
            if (footprint) await restoreCardFootprint(footprint);
          },
        }),
      "删除失败",
    );
  }

  function setValue(key: string, value: unknown) {
    update({
      values: { ...draft.values, [key]: value },
      updated_at: nowMs(),
    });
  }

  const visibleFields = cardType.fields
    .filter((f) => !f.deprecated)
    .sort((a, b) => a.order - b.order);

  // 当前卡的图，用于图像覆盖预览
  const cardImagePath: string | null = (() => {
    const imageKey = cardType.card_frame?.bindings?.image?.source;
    if (imageKey) {
      const v = draft.values[imageKey];
      if (typeof v === "string" && v.trim()) return v;
    }
    for (const f of visibleFields) {
      if (f.ty.kind === "image") {
        const v = draft.values[f.key];
        if (typeof v === "string" && v.trim()) return v;
      }
    }
    return null;
  })();

  const hasOverride = draft.image_crop_override != null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        // 文档 tab 时弹性填满检查器，给 CodeMirror 确定高度
        ...(tab === "doc" ? { flex: 1, minHeight: 0 } : {}),
      }}
    >
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
          名称
        </div>
        <input
          className="input"
          value={draft.name}
          onChange={(e) =>
            update({ name: e.target.value, updated_at: nowMs() })
          }
          style={{
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-title)",
          }}
        />
      </div>

      {/* 字段 / 文档 切换 */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <TabButton active={tab === "fields"} onClick={() => setTab("fields")}>
          字段
        </TabButton>
        <TabButton active={tab === "doc"} onClick={() => setTab("doc")}>
          文档
        </TabButton>
      </div>

      {tab === "doc" && (
        <>
          <DocFieldSummary card={draft} cardType={cardType} />
          <CardDocEditor
            cardId={card.id}
            onOpenPage={() => setActiveModule("docs")}
          />
        </>
      )}

      {tab === "fields" && (
        <>
          {visibleFields.length === 0 && (
            <p className="muted">
              该类型还没有字段，去「类型」里添加
            </p>
          )}

          {visibleFields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={draft.values[field.key]}
              onChange={(v) => setValue(field.key, v)}
            />
          ))}

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              alignItems: "center",
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
              disabled={!dirty}
              style={{ fontSize: 11 }}
            >
              保存
            </button>
            <button
              className="btn btn-danger spacer"
              onClick={handleDelete}
            >
              删除
            </button>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 12,
              marginTop: 12,
            }}
          >
            <RelationsPanel card={card} />
          </div>

          {/* 图像覆盖 */}
          <details
            style={{
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 12,
              marginTop: 12,
              fontSize: 12,
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                color: "var(--fg-secondary)",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              图像覆盖（此卡单独配置）
              {hasOverride && (
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--accent-gold)",
                  }}
                >
                  ● 已覆盖
                </span>
              )}
            </summary>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  lineHeight: 1.5,
                }}
              >
                留空则跟随类型配置。设置任意一项后，此卡不再使用类型的对应配置。
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--fg-muted)",
                    marginBottom: 6,
                  }}
                >
                  裁剪覆盖
                </div>
                <CropEditor
                  value={draft.image_crop_override ?? null}
                  onChange={(crop) =>
                    update({ image_crop_override: crop, updated_at: nowMs() })
                  }
                  imagePath={cardImagePath}
                />
              </div>

              {hasOverride && (
                <button
                  className="btn btn-danger"
                  onClick={() =>
                    update({
                      image_crop_override: null,
                      updated_at: nowMs(),
                    })
                  }
                  style={{ fontSize: 11, alignSelf: "flex-start" }}
                >
                  清除覆盖
                </button>
              )}
            </div>
          </details>

          <details style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            <summary>原始数据</summary>
            <pre style={{ overflow: "auto", maxHeight: 200 }}>
              {JSON.stringify(draft, null, 2)}
            </pre>
          </details>
        </>
      )}
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
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        borderBottom: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
        padding: "4px 8px",
      }}
    >
      {children}
    </button>
  );
}
