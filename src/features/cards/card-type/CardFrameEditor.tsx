import type { CardType } from "../../../core/ipc";
import {
  CARD_FRAME_STYLE_LABELS,
  DEFAULT_CARD_FRAME_STYLE,
  isCardFrameStyle,
  type CardFrameStyle,
} from "../../../components/CardFrame";
import { ImageField } from "../../../components/ImageField";
import { useProjectStore } from "../../../stores/projectStore";
import { AccentColorRow } from "./AccentColorRow";
import { CropEditor } from "./CropEditor";
import { FoilTriggerRow } from "./FoilTriggerRow";
import { ImageExtendRow } from "./ImageExtendRow";
import {
  FieldSelect,
  LabeledInput,
  LabeledSelect,
} from "./CardFrameFormFields";

interface Props {
  cardType: CardType;
  onChange: (cfg: CardType["card_frame"]) => void;
  onChangeColor: (color: string | null) => void;
  onChangeCardBack: (path: string | null) => void;
}

const STYLE_OPTIONS: { value: CardFrameStyle; label: string }[] = (
  Object.keys(CARD_FRAME_STYLE_LABELS) as CardFrameStyle[]
).map((v) => ({ value: v, label: CARD_FRAME_STYLE_LABELS[v] }));

export function CardFrameEditor({
  cardType,
  onChange,
  onChangeColor,
  onChangeCardBack,
}: Props) {
  const cfg = cardType.card_frame ?? { body: [], foil_values: [] };
  const fields = cardType.fields.filter((f) => !f.deprecated);

  const cards = useProjectStore((s) => s.cards) ?? [];

  const sampleImagePath: string | null = (() => {
    const typeCards = cards.filter((c) => c.type_id === cardType.id);
    for (const card of typeCards) {
      if (cfg.image) {
        const v = card.values[cfg.image];
        if (typeof v === "string" && v.trim()) return v;
      }
      for (const f of fields) {
        if (f.ty.kind === "image") {
          const v = card.values[f.key];
          if (typeof v === "string" && v.trim()) return v;
        }
      }
    }
    return null;
  })();

  const styleValue: CardFrameStyle | null = isCardFrameStyle(cfg.style)
    ? cfg.style
    : null;

  function set<K extends keyof NonNullable<CardType["card_frame"]>>(
    key: K,
    value: NonNullable<CardType["card_frame"]>[K],
  ) {
    onChange({ ...cfg, [key]: value });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          padding: 8,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          lineHeight: 1.5,
        }}
      >
        指定字段在卡框各区域显示。不填则自动猜测。
        <br />
        右侧检查器显示实时预览。
      </div>

      {/* 卡框风格 */}
      <LabeledSelect
        label="卡框风格"
        value={styleValue}
        onChange={(v) => set("style", v)}
        options={STYLE_OPTIONS}
        placeholder={`默认（${CARD_FRAME_STYLE_LABELS[DEFAULT_CARD_FRAME_STYLE]}）`}
      />

      {/* 强调色 */}
      <AccentColorRow value={cardType.color ?? null} onChange={onChangeColor} />

      {/* 卡背图片 */}
      <div>
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-muted)",
            marginBottom: 4,
          }}
        >
          卡背图片（留空用项目默认 / 内置图案）
        </div>
        <ImageField
          value={cardType.card_back ?? null}
          onChange={onChangeCardBack}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <FieldSelect
          label="标题字段（留空用卡名）"
          value={cfg.title}
          onChange={(v) => set("title", v)}
          options={fields}
        />
        <FieldSelect
          label="副标题"
          value={cfg.subtitle}
          onChange={(v) => set("subtitle", v)}
          options={fields}
        />
        <FieldSelect
          label="类型行（留空用类型名）"
          value={cfg.type_line}
          onChange={(v) => set("type_line", v)}
          options={fields}
        />
        <FieldSelect
          label="图像字段"
          value={cfg.image}
          onChange={(v) => set("image", v)}
          options={fields.filter((f) => f.ty.kind === "image")}
        />
      </div>

      {/* 图像裁剪 */}
      <div>
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-muted)",
            marginBottom: 6,
          }}
        >
          图像裁剪（拖拽调整可视区域）
        </div>
        <CropEditor
          value={cfg.image_crop ?? null}
          onChange={(crop) => set("image_crop", crop)}
          imagePath={sampleImagePath}
        />
      </div>

      {/* 图像出框 */}
      <ImageExtendRow
        value={cfg.image_extend ?? null}
        onChange={(v) => set("image_extend", v)}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <FieldSelect
          label="等级字段"
          value={cfg.level}
          onChange={(v) => set("level", v)}
          options={fields.filter((f) => f.ty.kind === "number")}
        />
        <LabeledInput
          label="等级显示名（留空用星号）"
          value={cfg.level_label ?? ""}
          onChange={(v) => set("level_label", v || null)}
          placeholder="例如：LV"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <FieldSelect
          label="攻击字段"
          value={cfg.atk}
          onChange={(v) => set("atk", v)}
          options={fields.filter((f) => f.ty.kind === "number")}
        />
        <LabeledInput
          label="攻击显示名（默认 ATK）"
          value={cfg.atk_label ?? ""}
          onChange={(v) => set("atk_label", v || null)}
          placeholder="例如：伤害"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <FieldSelect
          label="防御字段"
          value={cfg.def}
          onChange={(v) => set("def", v)}
          options={fields.filter((f) => f.ty.kind === "number")}
        />
        <LabeledInput
          label="防御显示名（默认 DEF）"
          value={cfg.def_label ?? ""}
          onChange={(v) => set("def_label", v || null)}
          placeholder="例如：价值"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <FieldSelect
          label="HP 字段"
          value={cfg.hp}
          onChange={(v) => set("hp", v)}
          options={fields.filter((f) => f.ty.kind === "number")}
        />
        <LabeledInput
          label="HP 显示名（默认 HP）"
          value={cfg.hp_label ?? ""}
          onChange={(v) => set("hp_label", v || null)}
          placeholder="例如：生命"
        />
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-muted)",
            marginBottom: 4,
          }}
        >
          正文字段（可多选，按选择顺序显示）
        </div>
        <div
          style={{
            maxHeight: 160,
            overflow: "auto",
            border: "1px solid var(--border-subtle)",
            padding: 6,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
          }}
        >
          {fields.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--fg-muted)", padding: 4 }}>
              暂无字段
            </div>
          )}
          {fields.map((f) => {
            const checked = cfg.body.includes(f.key);
            return (
              <label
                key={f.key}
                style={{
                  display: "flex",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--fg-secondary)",
                  cursor: "pointer",
                  padding: "2px 0",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const body = e.target.checked
                      ? [...cfg.body, f.key]
                      : cfg.body.filter((k) => k !== f.key);
                    set("body", body);
                  }}
                  style={{ accentColor: "var(--accent-gold)" }}
                />
                {f.label}（{f.key}）
              </label>
            );
          })}
        </div>
      </div>

      {/* 闪卡触发 */}
      <FoilTriggerRow
        cardType={cardType}
        fieldKey={cfg.foil_field ?? null}
        values={cfg.foil_values ?? []}
        foilStyle={cfg.foil_style ?? null}
        onChange={(patch) => onChange({ ...cfg, ...patch })}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-danger"
          onClick={() => onChange(null)}
          disabled={!cardType.card_frame}
          style={{ fontSize: 11 }}
        >
          清空映射
        </button>
      </div>
    </div>
  );
}
