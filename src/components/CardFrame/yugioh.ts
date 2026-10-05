import type { Card, CardType } from "../../core/ipc";

export interface YugiohMapping {
  title: string;
  subtitle?: string;
  typeLine: string;
  level?: number;
  atk?: number;
  def?: number;
  body: string;
  image?: string;
}

export function mapCard(card: Card, cardType: CardType): YugiohMapping {
  const cfg = cardType.card_frame;

  if (cfg) {
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

    const typeLine =
      cfg.type_line && typeof card.values[cfg.type_line] === "string"
        ? (card.values[cfg.type_line] as string)
        : cardType.name;

    // ★ image：显式配置优先，否则扫描第一个有值的 image 类型字段
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
      atk,
      def,
      body: bodyParts.join("\n"),
      image,
    };
  }

  return fallbackMap(card, cardType);
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

function fallbackMap(card: Card, cardType: CardType): YugiohMapping {
  const fields = cardType.fields
    .filter((f) => !f.deprecated)
    .sort((a, b) => a.order - b.order);

  let level: number | undefined;
  let atk: number | undefined;
  let def: number | undefined;
  let image: string | undefined;
  const bodyParts: string[] = [];

  for (const f of fields) {
    const v = card.values[f.key];
    const key = f.key.toLowerCase();
    const label = f.label.toLowerCase();

    // image 类型字段
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
    body: bodyParts.join("\n"),
    image,
  };
}
