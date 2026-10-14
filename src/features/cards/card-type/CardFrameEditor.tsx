import type { CardType, SlotBinding } from "../../../core/ipc";
import {
  getCardStyle,
  isCardStyleId,
  listCardStyles,
} from "../../../components/card/CardFrame";
import {
  DEFAULT_SLOTS,
  type SlotDef,
} from "../../../components/card/CardFrame/styles/types";
import {
  hasCardBackStyle,
  listCardBackStyles,
} from "../../../components/card/CardFrame/primitives/back-styles/registry";
import { useProjectStore } from "../../../stores/projectStore";
import { AccentColorRow } from "./AccentColorRow";
import { CropEditor } from "./CropEditor";
import { FoilTriggerRow } from "./FoilTriggerRow";
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

const STYLE_OPTIONS = listCardStyles().map((s) => ({
  value: s.id,
  label: s.label,
}));

const BACK_STYLE_OPTIONS = listCardBackStyles().map((s) => ({
  value: s.id,
  label: s.label,
}));

export function CardFrameEditor({
  cardType,
  onChange,
  onChangeColor,
  onChangeCardBack,
}: Props) {
  const cfg = cardType.card_frame ?? {
    bindings: {},
    foil_values: [],
  };
  const fields = cardType.fields.filter((f) => !f.deprecated);

  const cards = useProjectStore((s) => s.cards) ?? [];

  const sampleImagePath: string | null = (() => {
    const typeCards = cards.filter((c) => c.type_id === cardType.id);
    const imageKey = cfg.bindings?.image?.source;
    for (const card of typeCards) {
      if (imageKey) {
        const v = card.values[imageKey];
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

  const styleValue: string | null = isCardStyleId(cfg.style) ? cfg.style : null;
  const styleDef = getCardStyle(styleValue);
  const slots: SlotDef[] = styleDef.slots ?? DEFAULT_SLOTS;

  const backIsImage =
    cardType.card_back != null && !hasCardBackStyle(cardType.card_back);
  const backStyleValue: string | null = backIsImage
    ? null
    : (cardType.card_back ?? null);

  function set<K extends keyof NonNullable<CardType["card_frame"]>>(
    key: K,
    value: NonNullable<CardType["card_frame"]>[K],
  ) {
    onChange({ ...cfg, [key]: value });
  }

  function patchBinding(slotKey: string, patch: Partial<SlotBinding>) {
    const bindings = { ...(cfg.bindings ?? {}) };
    const existing = bindings[slotKey] ?? { values: [] };
    bindings[slotKey] = { ...existing, ...patch };
    set("bindings", bindings);
  }

  function getSource(slotKey: string): string | null {
    return (cfg.bindings ?? {})[slotKey]?.source ?? null;
  }

  function getLabel(slotKey: string): string {
    return (cfg.bindings ?? {})[slotKey]?.label ?? "";
  }

  function getValues(slotKey: string): string[] {
    return (cfg.bindings ?? {})[slotKey]?.values ?? [];
  }

  function renderSlot(slot: SlotDef) {
    // body：多选列表，跨两列
    if (slot.kind === "body") {
      const values = getValues(slot.key);
      return (
        <div key={slot.key} style={{ gridColumn: "1 / -1" }}>
          <div
            style={{
              fontSize: 12,
              color: "var(--fg-muted)",
              marginBottom: 4,
            }}
          >
            {slot.label}
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
              <div
                style={{
                  fontSize: 12,
                  color: "var(--fg-muted)",
                  padding: 4,
                }}
              >
                暂无字段
              </div>
            )}
            {fields.map((f) => {
              const checked = values.includes(f.key);
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
                      const next = e.target.checked
                        ? [...values, f.key]
                        : values.filter((k) => k !== f.key);
                      patchBinding(slot.key, { values: next });
                    }}
                    style={{ accentColor: "var(--accent-gold)" }}
                  />
                  {f.label}（{f.key}）
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    // 选项来源按 slot 类型过滤
    const fieldOptions =
      slot.kind === "image"
        ? fields.filter((f) => f.ty.kind === "image")
        : slot.kind === "stat"
          ? fields.filter((f) => f.ty.kind === "number")
          : fields;

    // stat：字段 + 显示名，两列子 grid
    if (slot.kind === "stat") {
      return (
        <div
          key={slot.key}
          style={{
            gridColumn: "1 / -1",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <FieldSelect
            label={slot.label}
            value={getSource(slot.key)}
            onChange={(v) => patchBinding(slot.key, { source: v })}
            options={fieldOptions}
          />
          <LabeledInput
            label="显示名"
            value={getLabel(slot.key)}
            onChange={(v) => patchBinding(slot.key, { label: v || null })}
            placeholder={
              slot.defaultStatLabel ? `默认 ${slot.defaultStatLabel}` : ""
            }
          />
        </div>
      );
    }

    // text / image：单字段选择
    return (
      <FieldSelect
        key={slot.key}
        label={slot.label}
        value={getSource(slot.key)}
        onChange={(v) => patchBinding(slot.key, { source: v })}
        options={fieldOptions}
      />
    );
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
        placeholder={`默认（${getCardStyle(null).label}）`}
      />

      {/* 强调色 */}
      <AccentColorRow value={cardType.color ?? null} onChange={onChangeColor} />

      {/* 卡背风格 */}
      <div>
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-muted)",
            marginBottom: 4,
          }}
        >
          卡背风格（留空用项目默认 / 内置铁砧）
        </div>
        {backIsImage && (
          <div
            style={{
              fontSize: 11,
              color: "var(--accent-gold)",
              marginBottom: 4,
              padding: "4px 6px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            旧数据图片：{cardType.card_back}
            <button
              className="btn"
              style={{ fontSize: 10, marginLeft: 6 }}
              onClick={() => onChangeCardBack(null)}
            >
              清除
            </button>
          </div>
        )}
        <LabeledSelect
          label=""
          value={backStyleValue}
          onChange={onChangeCardBack}
          options={BACK_STYLE_OPTIONS}
          placeholder="默认（项目设置 / 铁砧）"
        />
      </div>

      {/* 槽位配置（按当前风格的 slots 动态生成） */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        {slots.map(renderSlot)}
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
