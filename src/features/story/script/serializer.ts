import type { ParsedScript, ScriptLine } from "./types";

/**
 * 序列化为 Markdown 剧本。
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
  }
}
