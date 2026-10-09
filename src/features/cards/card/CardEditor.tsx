import { ipc, type Card, type CardType } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { useDraft } from "../../../hooks/useDraft";
import { FieldInput } from "../../../components/FieldInput";
import { RelationsPanel } from "./RelationsPanel";
import { nowMs } from "../../../lib/time";
import { useDeleteUndo } from "../../../hooks/useDeleteUndo";
import { CropEditor } from "../card-type/CropEditor";
import { ImageExtendRow } from "../card-type/ImageExtendRow";
import { confirmDialog } from "../../../lib/confirm";
import { runWithError } from "../../../lib/runWithError";

interface Props {
  card: Card;
  cardType: CardType;
}

export function CardEditor({ card, cardType }: Props) {
  const updateCard = useProjectStore((s) => s.updateCard);

  const { draft, dirty, update, commit } = useDraft(
    card,
    async (d): Promise<void> => {
      const next: Card = { ...d, updated_at: nowMs() };
      await ipc.saveCard(next);
      updateCard(next);
    },
    {
      undoLabel: "编辑卡牌",
      onDraftChange: (d) => {
        updateCard({ ...d, updated_at: nowMs() });
      },
    },
  );

  const deleteWithUndo = useDeleteUndo();

  async function handleDelete() {
    if (
      !(await confirmDialog({
        message: `确认删除卡牌「${card.name}」？可用 Ctrl+Z 撤销。`,
        confirmLabel: "删除",
        danger: true,
      }))
    )
      return;
    await runWithError(
      () =>
        deleteWithUndo({
          label: "删除卡牌",
          do: async () => {
            await ipc.deleteCard(card.id);
            useProjectStore.getState().removeCard(card.id);
          },
          restore: async () => {
            await ipc.saveCard(card);
            useProjectStore.getState().addCard(card);
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
    const cfg = cardType.card_frame;
    if (cfg?.image) {
      const v = draft.values[cfg.image];
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

  const hasOverride =
    draft.image_crop_override != null || draft.image_extend_override != null;

  return (
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

      {visibleFields.length === 0 && (
        <p style={{ color: "var(--fg-muted)", fontSize: 12 }}>
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
          className="btn btn-danger"
          onClick={handleDelete}
          style={{ marginLeft: "auto" }}
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

          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--fg-muted)",
                marginBottom: 6,
              }}
            >
              出框覆盖
            </div>
            <ImageExtendRow
              value={draft.image_extend_override ?? null}
              onChange={(v) =>
                update({ image_extend_override: v, updated_at: nowMs() })
              }
            />
          </div>

          {hasOverride && (
            <button
              className="btn btn-danger"
              onClick={() =>
                update({
                  image_crop_override: null,
                  image_extend_override: null,
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
    </div>
  );
}
