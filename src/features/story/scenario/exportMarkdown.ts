import { ipc, type Scenario } from "../../../core/ipc";

interface Args {
  scenario: Scenario;
}

/**
 * 从剧情生成可读 Markdown。
 * 头部为剧情名 / 描述 / 入口 knot，正文按文件名字典序原样拼合各剧本文件。
 */
export async function exportScenarioMarkdown({
  scenario,
}: Args): Promise<string> {
  const filenames = await ipc.listScenarioScriptFiles(scenario.id);

  const out: string[] = [];
  out.push(`# ${scenario.name}`);
  out.push("");
  if (scenario.description) {
    out.push(`> ${scenario.description}`);
    out.push("");
  }
  if (scenario.entry_knot) {
    out.push(`入口 knot：\`${scenario.entry_knot}\``);
    out.push("");
  }

  for (const filename of filenames) {
    const content = await ipc.loadScenarioScript(scenario.id, filename);
    if (!content || !content.trim()) continue;
    out.push("---");
    out.push("");
    out.push(`<!-- ${filename} -->`);
    out.push("");
    out.push(content.trim());
    out.push("");
  }

  // 结尾去掉多余空行
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  out.push("");
  return out.join("\n");
}
