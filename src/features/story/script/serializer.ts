import type { ParsedScript, ScriptLine } from "./types";

/**
 * 序列化为 Markdown 剧本（weave 语法）。
 * inline 字段不参与序列化（text 里已含原文）。
 */
export function serializeScript(script: ParsedScript): string {
  const out: string[] = [];

  // frontmatter
  const fm: string[] = [];
  const f = script.frontmatter;
  if (f.bg) fm.push(`bg: ${f.bg}`);
  if (f.bgm) fm.push(`bgm: ${f.bgm}`);
  if (f.is_ending !== undefined) fm.push(`is_ending: ${f.is_ending}`);
  if (f.ending_name) fm.push(`ending_name: ${f.ending_name}`);

  if (fm.length > 0) {
    out.push("---");
    out.push(...fm);
    out.push("---");
    out.push("");
  }

  // lines
  for (const line of script.lines) {
    out.push(serializeLine(line));
  }

  return out.join("\n");
}

function serializeLine(line: ScriptLine): string {
  switch (line.type) {
    case "knot":
      return `=== ${line.name}`;
    case "var":
      return `VAR ${line.key} = ${line.literal}`;
    case "narration":
      return `> ${line.text}`;
    case "say": {
      const head = line.portrait
        ? `**${line.speaker}**（${line.portrait}）`
        : `**${line.speaker}**`;
      return `${head}：${line.text}`;
    }
    case "action":
      return `*${line.text}*`;
    case "bg":
      return `@bg ${line.image}`;
    case "bgm":
      return `@bgm ${line.file}`;
    case "sfx":
      return `@sfx ${line.file}`;
    case "scene_ref":
      return `@scene ${line.cardName}`;
    case "actor_ref":
      return `@actor ${line.cardName}`;
    case "jump":
      return `-> ${line.target}`;
    case "choice":
      return `* ${line.label}`;
    case "gather":
      return line.text ? `- ${line.text}` : `-`;
    case "condition":
      return line.text ? `{${line.expr}: ${line.text}}` : `{${line.expr}}`;
    case "assign":
      return `~ ${line.key} ${line.op} ${line.value}`;
    case "glue":
      return `<>`;
  }
}
