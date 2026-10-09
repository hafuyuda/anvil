import type { Card, CardType, CropRect, ImageExtend } from "../../core/ipc";

/**
 * 卡牌的「内容」——从 Card.values 里提取的显示数据。
 * 不涉及该不该显示、怎么显示。
 */
export interface CardContent {
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
  body: string;
  image?: string;
}

/**
 * 卡牌的「特性」——附加的视觉处理（裁剪、出框、闪卡）。
 * 决定「怎么做」，而不是「做什么」。
 */
export interface CardFeatures {
  crop: CropRect | null;
  extend: ImageExtend | null;
  foil: boolean;
  foilVariant: "gold" | "silver";
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

function contentFromConfig(
  card: Card,
  cardType: CardType,
  cfg: NonNullable<CardType["card_frame"]>,
): CardContent {
  const title =
    cfg.title && typeof card.values[cfg.title] === "string"
      ? (card.values[cfg.title] as string)
      : card.name;

  const subtitle =
    cfg.subtitle && typeof card.values[cfg.subtitle] === "string"
      ? (card.values[cfg.subtitle] as string)
      : undefined;

  const level =
    cfg.level && typeof card.values[cfg.level] === "number"
      ? (card.values[cfg.level] as number)
      : undefined;

  const atk =
    cfg.atk && typeof card.values[cfg.atk] === "number"
      ? (card.values[cfg.atk] as number)
      : undefined;

  const def =
    cfg.def && typeof card.values[cfg.def] === "number"
      ? (card.values[cfg.def] as number)
      : undefined;

  const hp =
    cfg.hp && typeof card.values[cfg.hp] === "number"
      ? (card.values[cfg.hp] as number)
      : undefined;

  const typeLine =
    cfg.type_line && typeof card.values[cfg.type_line] === "string"
      ? (card.values[cfg.type_line] as string)
      : cardType.name;

  const image =
    cfg.image && typeof card.values[cfg.image] === "string"
      ? (card.values[cfg.image] as string)
      : findImageField(card, cardType);

  const bodyParts: string[] = [];
  for (const key of cfg.body) {
    const v = card.values[key];
    if (typeof v === "string" && v.trim()) {
      bodyParts.push(v);
    } else if (Array.isArray(v) && v.length > 0) {
      bodyParts.push((v as unknown[]).join(" / "));
    }
  }

  return {
    title,
    subtitle,
    typeLine,
    level,
    levelLabel: cfg.level_label?.trim() || undefined,
    atk,
    atkLabel: cfg.atk_label?.trim() || undefined,
    def,
    defLabel: cfg.def_label?.trim() || undefined,
    hp,
    hpLabel: cfg.hp_label?.trim() || undefined,
    body: bodyParts.join("\n"),
    image,
  };
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

  return {
    title: card.name,
    typeLine: cardType.name,
    level,
    atk,
    def,
    hp,
    body: bodyParts.join("\n"),
    image,
  };
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

  // 裁剪 / 出框：卡级 override 优先，类型级 fallback
  const crop = card.image_crop_override ?? cfg?.image_crop ?? null;
  const extend = card.image_extend_override ?? cfg?.image_extend ?? null;

  // 闪卡：foil_field 指向的字段值命中 foil_values
  let foil = false;
  if (cfg?.foil_field && cfg.foil_values && cfg.foil_values.length > 0) {
    const v = card.values[cfg.foil_field];
    foil = matchesFoil(v, new Set(cfg.foil_values));
  }

  const foilVariant: "gold" | "silver" =
    cfg?.foil_style === "silver" ? "silver" : "gold";

  return { crop, extend, foil, foilVariant };
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
