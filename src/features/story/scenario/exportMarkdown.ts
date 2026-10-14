import { ipc, type Card, type CardType, type Scenario } from "../../../core/ipc";
import { parseScript } from "../script/parser";

interface Args {
  scenario: Scenario;
  cards: Card[];
  cardTypes: CardType[];
}

/**
 * 从剧情生成 Markdown 剧本。
 * 场景按入口优先的节点顺序输出；分支来自各场景剧本的 jump 行。
 */
export async function exportScenarioMarkdown({
  scenario,
  cards,
  cardTypes,
}: Args): Promise<string> {
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const typeMap = new Map(cardTypes.map((t) => [t.id, t]));

  // 顺序：入口优先，其余按 node_ids
  const entry = scenario.entry_node ?? scenario.node_ids[0];
  const order: string[] = [];
  if (entry && scenario.node_ids.includes(entry)) order.push(entry);
  for (const id of scenario.node_ids) {
    if (!order.includes(id)) order.push(id);
  }

  // 每个节点的顺序号
  const orderMap = new Map<string, number>();
  order.forEach((id, i) => orderMap.set(id, i + 1));

  // 并行读所有剧本
  const scriptMap = new Map<string, string>();
  await Promise.all(
    order.map(async (id) => {
      try {
        const content = await ipc.loadScript(id);
        if (content && content.trim()) {
          scriptMap.set(id, content.trim());
        }
      } catch {
        // 忽略读取失败
      }
    }),
  );

  // 场景名 → 节点 id（jump 目标解析用）
  const nodeByName = new Map<string, string>();
  for (const id of order) {
    const card = cardMap.get(id);
    if (card) nodeByName.set(card.name, id);
  }

  const out: string[] = [];

  // 标题
  out.push(`# ${scenario.name}`);
  out.push("");
  if (scenario.description) {
    out.push(`> ${scenario.description}`);
    out.push("");
  }

  // 变量
  if (scenario.variables.length > 0) {
    out.push("## 变量");
    out.push("");
    for (const v of scenario.variables) {
      const defStr =
        v.default === undefined || v.default === null
          ? ""
          : `，默认 ${JSON.stringify(v.default)}`;
      out.push(
        `- \`${v.key}\`（${v.label}，${typeLabel(v.ty.kind)}${defStr}）`,
      );
    }
    out.push("");
  }

  out.push("---");
  out.push("");

  // 场景
  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    const card = cardMap.get(id);
    if (!card) continue;
    const cardType = typeMap.get(card.type_id);

    out.push(`## 场景 ${i + 1}：${card.name}`);
    out.push("");

    // 元信息
    const meta = sceneMeta(card, cardMap);
    if (meta.length > 0) {
      for (const m of meta) out.push(`> ${m}`);
      out.push("");
    }

    // 结局标记
    if (card.values?.is_ending === true) {
      const name = (card.values?.ending_name as string) ?? "";
      out.push(`**[结局${name ? `：${name}` : ""}]**`);
      out.push("");
    }

    // 主体：剧本 > description + dialogue
    const script = scriptMap.get(id);
    if (script) {
      out.push(script);
      out.push("");
    } else {
      const desc = (card.values?.description as string) ?? "";
      const dlg = (card.values?.dialogue as string) ?? "";
      if (desc) {
        out.push(desc);
        out.push("");
      }
      if (dlg) {
        out.push("**对白**");
        out.push("");
        out.push(dlg);
        out.push("");
      }
      if (!desc && !dlg) {
        const typeName = cardType?.name ?? "未知类型";
        out.push(`*（此场景没有内容。卡类型：${typeName}）*`);
        out.push("");
      }
    }

    // 分支：扫剧本 jump 行
    const jumps = script
      ? parseScript(script).lines.filter((l) => l.type === "jump")
      : [];
    if (jumps.length > 0) {
      out.push(`**分支**（${jumps.length}）`);
      out.push("");
      const seen = new Set<string>();
      for (const j of jumps) {
        if (j.type !== "jump" || seen.has(j.target)) continue;
        seen.add(j.target);
        const targetId = nodeByName.get(j.target);
        const targetNum = targetId ? (orderMap.get(targetId) ?? 0) : 0;
        const target =
          targetNum > 0 ? `场景 ${targetNum}：${j.target}` : `${j.target}（未知场景）`;
        out.push(`- → ${target}`);
      }
      out.push("");
    } else if (card.values?.is_ending !== true) {
      // 无分支且非结局
      out.push("*（无后续分支）*");
      out.push("");
    }

    out.push("---");
    out.push("");
  }

  // 结尾去掉多余分隔
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  if (out[out.length - 1] === "---") out.pop();

  return out.join("\n");
}

function typeLabel(kind: string): string {
  const m: Record<string, string> = {
    text: "文本",
    rich_text: "富文本",
    number: "数字",
    bool: "布尔",
    date: "日期",
    color: "颜色",
    enum: "枚举",
    multi_enum: "多选枚举",
    tags: "标签",
    ref: "引用",
    image: "图片",
    url: "URL",
    json: "JSON",
  };
  return m[kind] ?? kind;
}

function sceneMeta(card: Card, cardMap: Map<string, Card>): string[] {
  const out: string[] = [];
  const time = card.values?.time;
  const mood = card.values?.mood;
  const location = card.values?.location;
  const participants = card.values?.participants;

  if (typeof time === "string" && time) out.push(`时间：${time}`);
  if (typeof mood === "string" && mood) out.push(`氛围：${mood}`);

  if (typeof location === "string" && location) {
    const loc = cardMap.get(location);
    out.push(`地点：${loc?.name ?? location.slice(0, 8)}`);
  }

  if (Array.isArray(participants) && participants.length > 0) {
    const names = (participants as string[])
      .map((id) => cardMap.get(id)?.name ?? id.slice(0, 8))
      .join("、");
    out.push(`参与者：${names}`);
  } else if (typeof participants === "string" && participants) {
    const p = cardMap.get(participants);
    out.push(`参与者：${p?.name ?? participants.slice(0, 8)}`);
  }

  return out;
}
