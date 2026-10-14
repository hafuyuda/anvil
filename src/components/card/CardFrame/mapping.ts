import type { Card, CardType, CropRect } from "../../../core/ipc";
import { hasFoilStyle } from "./primitives/foil-styles/registry";

/**
 * 槽位值：由 `CardContent` 旧字段镜像而来。
 * 阶段 2 只做「旧字段 → slots」的只读镜像，
 * 阶段 3 起由 `CardType.card_frame.bindings` 驱动。
 */
export type SlotValue =
  | { kind: "text"; text: string }
  | { kind: "stat"; value: number; label: string | null }
  | { kind: "body"; lines: string[] }
  | { kind: "image"; path: string | null };

/**
 * 卡牌的「内容」——从 Card.values 里提取的显示数据。
 * 不涉及该不该显示、怎么显示。
 */
export interface CardContent {
  /** 槽位视图：风格组件唯一读取入口 */
  slots: Record<string, SlotValue>;
}

/**
 * 卡牌的「特性」——附加的视觉处理（裁剪、出框、闪卡）。
 * 决定「怎么做」，而不是「做什么」。
 */
export interface CardFeatures {
  crop: CropRect | null;
  foil: boolean;
  foilVariant: string;
}

// ────────────────────────────────────────────────────────────
// 内容提取
// ────────────────────────────────────────────────────────────

export function mapContent(card: Card, cardType: CardType): CardContent {
  const cfg = cardType.card_frame;
  if (cfg) {
    return contentFromConfig(card, cardType, cfg);
  }
  return contentFallback(card, cardType);
}

interface SlotInput {
  title: string;
  subtitle?: string;
  typeLine: string;
  level?: number;
  levelLabel?: string;
  atk?: number;
  atkLabel?: string;
  def?: number;
  defLabel?: string;
  hp?: number;
  hpLabel?: string;
  bodyLines: string[];
  image?: string;
}

function buildSlots(input: SlotInput): Record<string, SlotValue> {
  const slots: Record<string, SlotValue> = {};

  if (input.title) {
    slots.title = { kind: "text", text: input.title };
  }
  if (input.subtitle) {
    slots.subtitle = { kind: "text", text: input.subtitle };
  }
  if (input.typeLine) {
    slots.type_line = { kind: "text", text: input.typeLine };
  }
  if (input.level !== undefined) {
    slots.level = {
      kind: "stat",
      value: input.level,
      label: input.levelLabel ?? null,
    };
  }
  if (input.atk !== undefined) {
    slots.atk = {
      kind: "stat",
      value: input.atk,
      label: input.atkLabel ?? null,
    };
  }
  if (input.def !== undefined) {
    slots.def = {
      kind: "stat",
      value: input.def,
      label: input.defLabel ?? null,
    };
  }
  if (input.hp !== undefined) {
    slots.hp = {
      kind: "stat",
      value: input.hp,
      label: input.hpLabel ?? null,
    };
  }
  if (input.bodyLines.length > 0) {
    slots.body = { kind: "body", lines: [...input.bodyLines] };
  }
  if (input.image) {
    slots.image = { kind: "image", path: input.image };
  }

  return slots;
}

function contentFromConfig(
  card: Card,
  cardType: CardType,
  cfg: NonNullable<CardType["card_frame"]>,
): CardContent {
  const bindings = cfg.bindings ?? {};

  const title = readString(card, bindings.title?.source) ?? card.name;
  const subtitle = readString(card, bindings.subtitle?.source);
  const typeLine =
    readString(card, bindings.type_line?.source) ?? cardType.name;
  const image =
    readString(card, bindings.image?.source) ?? findImageField(card, cardType);

  const level = readNumber(card, bindings.level?.source);
  const atk = readNumber(card, bindings.atk?.source);
  const def = readNumber(card, bindings.def?.source);
  const hp = readNumber(card, bindings.hp?.source);

  const levelLabel = bindings.level?.label?.trim() || undefined;
  const atkLabel = bindings.atk?.label?.trim() || undefined;
  const defLabel = bindings.def?.label?.trim() || undefined;
  const hpLabel = bindings.hp?.label?.trim() || undefined;

  const bodySources = bindings.body?.values ?? [];
  const bodyParts: string[] = [];
  for (const key of bodySources) {
    const v = card.values[key];
    if (typeof v === "string" && v.trim()) {
      bodyParts.push(v);
    } else if (Array.isArray(v) && v.length > 0) {
      bodyParts.push((v as unknown[]).join(" / "));
    }
  }

  const slots = buildSlots({
    title,
    subtitle,
    typeLine,
    level,
    levelLabel,
    atk,
    atkLabel,
    def,
    defLabel,
    hp,
    hpLabel,
    bodyLines: bodyParts,
    image,
  });

  return { slots };
}

/** 读字符串值：key 空、值非 string、值空白都返回 undefined */
function readString(
  card: Card,
  key: string | null | undefined,
): string | undefined {
  if (!key) return undefined;
  const v = card.values[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

/** 读数字值：key 空、值非 number 返回 undefined */
function readNumber(
  card: Card,
  key: string | null | undefined,
): number | undefined {
  if (!key) return undefined;
  const v = card.values[key];
  return typeof v === "number" ? v : undefined;
}

function contentFallback(card: Card, cardType: CardType): CardContent {
  const fields = cardType.fields
    .filter((f) => !f.deprecated)
    .sort((a, b) => a.order - b.order);

  let level: number | undefined;
  let atk: number | undefined;
  let def: number | undefined;
  let hp: number | undefined;
  let image: string | undefined;
  const bodyParts: string[] = [];

  for (const f of fields) {
    const v = card.values[f.key];
    const key = f.key.toLowerCase();
    const label = f.label.toLowerCase();

    if (
      image === undefined &&
      f.ty.kind === "image" &&
      typeof v === "string" &&
      v.trim()
    ) {
      image = v;
      continue;
    }

    if (
      level === undefined &&
      (key.includes("level") ||
        key.includes("star") ||
        label.includes("等级") ||
        label.includes("星级")) &&
      typeof v === "number"
    ) {
      level = v;
      continue;
    }
    if (
      atk === undefined &&
      (key === "atk" ||
        key.includes("attack") ||
        label === "攻击" ||
        label.includes("攻击力")) &&
      typeof v === "number"
    ) {
      atk = v;
      continue;
    }
    if (
      def === undefined &&
      (key === "def" ||
        key.includes("defense") ||
        label === "防御" ||
        label.includes("防御力")) &&
      typeof v === "number"
    ) {
      def = v;
      continue;
    }
    if (
      hp === undefined &&
      (key === "hp" || label === "生命" || label.includes("生命值")) &&
      typeof v === "number"
    ) {
      hp = v;
      continue;
    }

    if (f.ty.kind === "rich_text" || f.ty.kind === "text") {
      if (typeof v === "string" && v.trim()) {
        bodyParts.push(v);
      }
    } else if (f.ty.kind === "tags" && Array.isArray(v) && v.length) {
      bodyParts.push(v.join(" / "));
    } else if (f.ty.kind === "enum" && typeof v === "string" && v) {
      bodyParts.push(`${f.label}：${v}`);
    }
  }

  const slots = buildSlots({
    title: card.name,
    typeLine: cardType.name,
    level,
    atk,
    def,
    hp,
    bodyLines: bodyParts,
    image,
  });

  return { slots };
}

function findImageField(card: Card, cardType: CardType): string | undefined {
  for (const f of cardType.fields) {
    if (f.deprecated) continue;
    if (f.ty.kind === "image") {
      const v = card.values[f.key];
      if (typeof v === "string" && v.trim()) {
        return v;
      }
    }
  }
  return undefined;
}

// ────────────────────────────────────────────────────────────
// 特性触发
// ────────────────────────────────────────────────────────────

export function resolveFeatures(card: Card, cardType: CardType): CardFeatures {
  const cfg = cardType.card_frame;

  // 裁剪：卡级 override 优先，类型级 fallback
  const crop = card.image_crop_override ?? cfg?.image_crop ?? null;

  // 闪卡：foil_field 指向的字段值命中 foil_values
  let foil = false;
  if (cfg?.foil_field && cfg.foil_values && cfg.foil_values.length > 0) {
    const v = card.values[cfg.foil_field];
    foil = matchesFoil(v, new Set(cfg.foil_values));
  }

  const foilVariant =
    cfg?.foil_style && hasFoilStyle(cfg.foil_style) ? cfg.foil_style : "gold";

  return { crop, foil, foilVariant };
}

/**
 * 判断一个值是否命中触发集合。
 * 覆盖：string / number / bool / string[]（multi_enum / tags / ref）。
 */
function matchesFoil(value: unknown, targets: Set<string>): boolean {
  if (typeof value === "string") return targets.has(value);
  if (typeof value === "number") return targets.has(String(value));
  if (typeof value === "boolean") return targets.has(String(value));
  if (Array.isArray(value)) {
    return value.some((x) => typeof x === "string" && targets.has(x));
  }
  return false;
}
