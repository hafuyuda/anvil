import {
  ipc,
  type Card,
  type CardType,
  type Relation,
  type Scenario,
} from "../../../core/ipc";

interface Args {
  scenario: Scenario;
  cards: Card[];
  cardTypes: CardType[];
  relations: Relation[];
}

/**
 * 从剧情生成 Markdown 剧本。
 * DFS 定顺序，扁平输出。所有场景按访问顺序编号，分支只列出「去哪」。
 */
export async function exportScenarioMarkdown({
  scenario,
  cards,
  cardTypes,
  relations,
}: Args): Promise<string> {
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const typeMap = new Map(cardTypes.map((t) => [t.id, t]));
  const nodeIdSet = new Set(scenario.node_ids);

  // 只保留本剧情的边
  const scenarioEdges = relations.filter(
    (r) =>
      r.meta?.scenario_id === scenario.id &&
      nodeIdSet.has(r.from) &&
      nodeIdSet.has(r.to),
  );

  // 按 from 分组
  const outgoingByFrom = new Map<string, Relation[]>();
  for (const e of scenarioEdges) {
    const list = outgoingByFrom.get(e.from) ?? [];
    list.push(e);
    outgoingByFrom.set(e.from, list);
  }

  // DFS 定顺序
  const order: string[] = [];
  const visited = new Set<string>();

  function dfs(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    order.push(id);
    const outgoing = outgoingByFrom.get(id) ?? [];
    for (const e of outgoing) {
      dfs(e.to);
    }
  }

  const entry = scenario.entry_node ?? scenario.node_ids[0];
  if (entry) dfs(entry);
  // 不可达节点追加在末尾
  for (const id of scenario.node_ids) {
    if (!visited.has(id)) dfs(id);
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

    // 分支
    const outgoing = outgoingByFrom.get(id) ?? [];
    if (outgoing.length > 0) {
      out.push(`**分支**（${outgoing.length}）`);
      out.push("");
      for (const e of outgoing) {
        const targetCard = cardMap.get(e.to);
        const targetName = targetCard?.name ?? e.to.slice(0, 8);
        const targetNum = orderMap.get(e.to) ?? 0;
        const label = e.label ?? "";
        const condition =
          typeof e.meta?.condition === "string" ? e.meta.condition.trim() : "";
        const effects = Array.isArray(e.meta?.effects)
          ? (e.meta.effects as unknown[]).map(String)
          : [];

        const head = label ? `[${label}]` : "";
        const condStr = condition ? `[条件：${condition}]` : "[无条件]";
        const target =
          targetNum > 0 ? `场景 ${targetNum}：${targetName}` : targetName;
        out.push(`- ${head} ${condStr} → ${target}`);
        for (const eff of effects) {
          out.push(`  · \`${eff}\``);
        }
      }
      out.push("");
    } else if (card.values?.is_ending !== true) {
      // 无出边且非结局
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
