import { ipc, type Scenario } from "../../../core/ipc";
import { parseScript } from "../script/parser";
import type {
  ParsedScript,
  ScriptFrontmatter,
  ScriptLine,
} from "../script/types";

interface Args {
  scenario: Scenario;
}

interface KnotRef {
  file: string;
  pc: number;
}

/**
 * 从剧情生成可读 Markdown：
 * - 每个 knot 一个二级标题
 * - 入口 knot 排第一，其余按从入口出发的首次可达顺序编号（不可达的按文件顺序补在最后）
 * - choice 渲染为嵌套列表，gather 标注为「汇合」
 */
export async function exportScenarioMarkdown({
  scenario,
}: Args): Promise<string> {
  const filenames = await ipc
    .listScenarioScriptFiles(scenario.id)
    .catch(() => [] as string[]);

  const parsedByFile = new Map<string, ParsedScript>();
  for (const f of filenames) {
    const content = await ipc
      .loadScenarioScript(scenario.id, f)
      .catch(() => "");
    if (content && content.trim()) parsedByFile.set(f, parseScript(content));
  }

  // 全局 knot 索引（与运行时一致：重名后出现者覆盖）
  const knotIndex = new Map<string, KnotRef>();
  for (const [f, p] of parsedByFile) {
    for (const [name, k] of Object.entries(p.knots)) {
      knotIndex.set(name, { file: f, pc: k.pc });
    }
  }

  const order = reachableOrder(
    filenames,
    parsedByFile,
    knotIndex,
    scenario.entry_knot ?? null,
  );

  const out: string[] = [];
  out.push(`# ${scenario.name}`);
  out.push("");
  if (scenario.description) {
    out.push(`> ${scenario.description}`);
    out.push("");
  }
  if (order.length > 0) {
    out.push(`入口 knot：\`${order[0]}\``);
    out.push("");
  }

  const multiFile = parsedByFile.size > 1;
  const frontmatterDone = new Set<string>();

  order.forEach((name, idx) => {
    const ref = knotIndex.get(name);
    const script = ref ? parsedByFile.get(ref.file) : undefined;
    const knot = script?.knots[name];
    if (!ref || !script || !knot) return;

    const suffixes: string[] = [];
    if (idx === 0) suffixes.push("入口");
    if (multiFile) suffixes.push(ref.file);
    const suffix = suffixes.length > 0 ? `（${suffixes.join(" · ")}）` : "";

    out.push(`## ${idx + 1}. ${name}${suffix}`);
    out.push("");

    if (!frontmatterDone.has(ref.file)) {
      frontmatterDone.add(ref.file);
      const note = frontmatterNote(script.frontmatter);
      if (note) {
        out.push(`*${note}*`);
        out.push("");
      }
    }

    // knot 主体：到下一个 knot 行为止
    let i = knot.pc + 1;
    while (i < script.lines.length && script.lines[i].type !== "knot") {
      i = renderTop(script, i, out);
    }
    if (out.length > 0 && out[out.length - 1] !== "") out.push("");
  });

  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  out.push("");
  return out.join("\n");
}

/** 入口优先 + 首次可达顺序，其余按文件顺序补充。 */
function reachableOrder(
  filenames: string[],
  parsedByFile: Map<string, ParsedScript>,
  knotIndex: Map<string, KnotRef>,
  entryKnot: string | null,
): string[] {
  const order: string[] = [];
  const seen = new Set<string>();

  const visit = (name: string) => {
    if (!name || name === "END" || seen.has(name)) return;
    const ref = knotIndex.get(name);
    if (!ref) return;
    seen.add(name);
    order.push(name);
    const script = parsedByFile.get(ref.file);
    const knot = script?.knots[name];
    if (!script || !knot) return;
    for (let i = knot.pc + 1; i < script.lines.length; i++) {
      const l = script.lines[i];
      if (l.type === "knot") break;
      if (l.type === "jump") visit(l.target);
    }
  };

  if (entryKnot) visit(entryKnot);
  if (order.length === 0) {
    for (const f of filenames) {
      const first = parsedByFile.get(f)?.knots;
      const name = first ? Object.keys(first)[0] : undefined;
      if (name) {
        visit(name);
        break;
      }
    }
  }
  for (const f of filenames) {
    const p = parsedByFile.get(f);
    if (!p) continue;
    for (const name of Object.keys(p.knots)) {
      if (!seen.has(name)) {
        seen.add(name);
        order.push(name);
      }
    }
  }
  return order;
}

/** 渲染顶层行；choice 组整组消费，返回下一个行索引。 */
function renderTop(
  script: ParsedScript,
  i: number,
  out: string[],
): number {
  const line = script.lines[i];
  if (line.type === "choice" && script.choiceGroups[i]) {
    return renderGroup(script, i, 0, out);
  }
  renderSimple(line, "", out);
  return i + 1;
}

/** 渲染一个 choice 组（含各选项 body 与 gather），返回组后第一个行索引。 */
function renderGroup(
  script: ParsedScript,
  groupStart: number,
  indent: number,
  out: string[],
): number {
  const group = script.choiceGroups[groupStart];
  if (!group) return groupStart + 1;
  const pad = "    ".repeat(indent);

  for (const c of group.choices) {
    out.push(`${pad}- **${c.label || "…"}**`);
    let j = c.bodyStart;
    while (j <= c.bodyEnd) {
      if (script.lines[j].type === "choice" && script.choiceGroups[j]) {
        j = renderGroup(script, j, indent + 1, out);
      } else {
        renderSimple(script.lines[j], `${pad}    `, out);
        j++;
      }
    }
  }

  if (group.gatherPc != null) {
    const g = script.lines[group.gatherPc];
    const text = g.type === "gather" && g.text ? ` ${g.text}` : "";
    out.push(`${pad}【汇合】${text}`.trimEnd());
    return group.gatherPc + 1;
  }
  const last = group.choices[group.choices.length - 1];
  return last.bodyEnd + 1;
}

function renderSimple(line: ScriptLine, pad: string, out: string[]) {
  switch (line.type) {
    case "knot":
    case "glue":
      break;
    case "var":
      out.push(`${pad}\`VAR ${line.key} = ${line.literal}\``);
      break;
    case "narration":
      out.push(`${pad}${line.text}`);
      break;
    case "say":
      out.push(
        `${pad}**${line.speaker}**${line.portrait ? `（${line.portrait}）` : ""}：${line.text}`,
      );
      break;
    case "action":
      out.push(`${pad}*${line.text}*`);
      break;
    case "bg":
      out.push(`${pad}（背景：${line.image}）`);
      break;
    case "bgm":
      out.push(`${pad}（音乐：${line.file}）`);
      break;
    case "sfx":
      out.push(`${pad}（音效：${line.file}）`);
      break;
    case "scene_ref":
      out.push(`${pad}（场景卡：${line.cardName}）`);
      break;
    case "actor_ref":
      out.push(`${pad}（角色：${line.cardName}）`);
      break;
    case "jump":
      out.push(`${pad}→ ${line.target === "END" ? "结束" : line.target}`);
      break;
    case "choice":
      out.push(`${pad}- ${line.label || "…"}`);
      break;
    case "gather":
      out.push(`${pad}【汇合】${line.text ? ` ${line.text}` : ""}`.trimEnd());
      break;
    case "condition":
      out.push(
        `${pad}（条件 ${line.expr}${line.text ? `：${line.text}` : ""}）`,
      );
      break;
    case "assign":
      out.push(`${pad}（变量 ${line.key} ${line.op} ${line.value}）`);
      break;
  }
}

function frontmatterNote(fm: ScriptFrontmatter): string {
  const parts: string[] = [];
  if (fm.bg) parts.push(`bg=${fm.bg}`);
  if (fm.bgm) parts.push(`bgm=${fm.bgm}`);
  if (fm.is_ending) parts.push("结局");
  if (fm.ending_name) parts.push(`结局名：${fm.ending_name}`);
  return parts.join(" · ");
}
