use super::project::Project;
use crate::core::model::scenario::Scenario;
use serde::Serialize;
use std::collections::BTreeMap;

/// 导出件的数据部分：只有素材与原文，没有任何剧本语义。
///
/// 语法解析、变量推断、knot 索引、推进逻辑全部由内联的
/// `reader_runtime.js`（唯一 TS 实现）负责 —— 这里一旦开始解析剧本，
/// 就又出现第二份实现。
#[derive(Serialize)]
struct ExportData {
    scenario: ExportScenario,
    /// 文件名（字典序）→ 原始行
    files: BTreeMap<String, Vec<String>>,
    /// 背景图路径 → data URL
    assets: BTreeMap<String, String>,
    /// 说话人（卡名）→ 立绘 data URL。key 与剧本 `**说话人**` 的说话人匹配。
    /// `default` 为 `portrait` 字段，`emotions` 为 `portrait_<表情>` 字段。
    portraits: BTreeMap<String, ExportPortrait>,
}

#[derive(Serialize)]
struct ExportPortrait {
    /// `portrait` 字段的 data URL（无表情时回退）
    default: Option<String>,
    /// `portrait_<表情>` → data URL
    emotions: BTreeMap<String, String>,
}

#[derive(Serialize)]
struct ExportScenario {
    name: String,
    description: Option<String>,
    entry_knot: Option<String>,
}

impl Project {
    pub fn export_scenario_html(
        &self,
        scenario_id: &str,
        output_path: &std::path::Path,
    ) -> anyhow::Result<()> {
        let scenarios = self.load_scenarios()?;
        let scenario = scenarios
            .iter()
            .find(|s| s.id == scenario_id)
            .ok_or_else(|| anyhow::anyhow!("找不到剧情：{scenario_id}"))?;

        let data = self.collect_export_data(scenario)?;
        let html = render_html(&data)?;

        std::fs::write(output_path, html)?;
        Ok(())
    }

    fn collect_export_data(&self, scenario: &Scenario) -> anyhow::Result<ExportData> {
        let mut files: BTreeMap<String, Vec<String>> = BTreeMap::new();
        let mut assets: BTreeMap<String, String> = BTreeMap::new();

        // list_script_files 按文件名字典序返回
        for filename in self.list_script_files(&scenario.id)? {
            let Some(content) = self.load_script(&scenario.id, &filename)? else {
                continue;
            };

            // 只做「哪些图片要内嵌」这一件事：正文语义归引擎，这里不解析。
            if let Some(bg) = extract_frontmatter_value(&content, "bg") {
                self.embed_asset(&mut assets, &bg);
            }

            let raw_lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
            for raw in &raw_lines {
                if let Some(rest) = raw.trim().strip_prefix("@bg ") {
                    self.embed_asset(&mut assets, rest.trim());
                }
            }

            files.insert(filename, raw_lines);
        }

        // 立绘：按卡名匹配说话人。约定与运行时一致——卡 values 的
        // `portrait_<表情>` 为对应表情 image，`portrait` 为默认立绘。
        let mut portraits: BTreeMap<String, ExportPortrait> = BTreeMap::new();
        if let Ok(cards) = self.load_all_cards() {
            for card in &cards {
                let mut default = None;
                let mut emotions: BTreeMap<String, String> = BTreeMap::new();
                if let Some(serde_json::Value::String(p)) = card.values.get("portrait") {
                    if let Ok(url) = self.read_image_data_url(p) {
                        default = Some(url);
                    }
                }
                for (k, v) in &card.values {
                    if let Some(emotion) = k.strip_prefix("portrait_") {
                        if let serde_json::Value::String(p) = v {
                            if let Ok(url) = self.read_image_data_url(p) {
                                emotions.insert(emotion.to_string(), url);
                            }
                        }
                    }
                }
                if default.is_some() || !emotions.is_empty() {
                    portraits.insert(card.name.clone(), ExportPortrait { default, emotions });
                }
            }
        }

        Ok(ExportData {
            scenario: ExportScenario {
                name: scenario.name.clone(),
                description: scenario.description.clone(),
                // 原样传给引擎：入口解析（含「显式写错」与「回退首个 knot」）
                // 也在引擎里，Rust 不参与。
                entry_knot: scenario.entry_knot.clone(),
            },
            files,
            assets,
            portraits,
        })
    }

    fn embed_asset(&self, assets: &mut BTreeMap<String, String>, path: &str) {
        if path.is_empty() || assets.contains_key(path) {
            return;
        }
        if let Ok(url) = self.read_image_data_url(path) {
            assets.insert(path.to_string(), url);
        }
    }
}

fn extract_frontmatter_value(md: &str, key: &str) -> Option<String> {
    let mut lines = md.lines();
    let first = lines.next()?;
    if first.trim() != "---" {
        return None;
    }
    for line in lines {
        if line.trim() == "---" {
            break;
        }
        if let Some(colon) = line.find(':') {
            let k = line[..colon].trim();
            if k == key {
                let v = line[colon + 1..].trim();
                let v = v.trim_matches(|c| c == '"' || c == '\'');
                return Some(v.to_string());
            }
        }
    }
    None
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

const HTML_TEMPLATE: &str = r##"<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__</title>
<style>
  :root {
    --bg: #1a1612;
    --panel: #25201a;
    --surface: #2f2922;
    --fg: #e8dcc5;
    --fg-dim: #a89880;
    --fg-muted: #6d6252;
    --accent: #c9a961;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--bg); color: var(--fg);
    font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 15px; line-height: 1.7;
  }
  #stage {
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 24px 120px;
    min-height: 100vh;
  }
  h1 {
    font-family: Georgia, "Songti SC", serif;
    font-size: 30px; color: var(--accent);
    margin: 0 0 8px; letter-spacing: 1px;
  }
  .desc { color: var(--fg-dim); font-size: 14px; margin-bottom: 32px; font-style: italic; }
  .scene-bg {
    width: 100%; max-height: 400px; object-fit: cover;
    border-radius: 8px; margin-bottom: 24px; display: block;
    background: var(--panel);
  }
  #scene-host { min-height: 100px; }
  .line { margin-bottom: 14px; line-height: 1.8; white-space: pre-wrap; }
  .line.narration, .line.action { font-style: italic; color: var(--fg-dim); }
  .line.say .speaker {
    color: var(--accent); font-weight: 600; margin-right: 4px;
    font-family: Georgia, "Songti SC", serif;
  }
  .line.say .avatar {
    width: 44px; height: 44px; border-radius: 50%;
    object-fit: cover; float: left; margin: 0 12px 4px 0;
    border: 2px solid var(--accent);
    background: var(--panel);
  }
  .line.say::after { content: ""; display: block; clear: both; }
  .line.bgm, .line.sfx {
    font-family: ui-monospace, monospace; font-size: 12px;
    color: var(--fg-muted); padding: 4px 8px;
    background: var(--panel); border-radius: 4px; display: inline-block;
  }
  .line.gather { font-style: italic; color: var(--fg-dim); }
  .hint {
    position: fixed; right: 24px; bottom: 24px;
    font-size: 12px; color: var(--fg-muted);
    pointer-events: none; opacity: 0; transition: opacity 0.2s;
  }
  .hint.show { opacity: 1; }
  #choices { margin-top: 24px; }
  .choice {
    display: block; width: 100%; text-align: left;
    padding: 12px 16px; margin-bottom: 8px;
    background: var(--panel); border: 1px solid var(--surface);
    border-radius: 6px; color: var(--fg);
    font-family: inherit; font-size: 14px;
    cursor: pointer; transition: all 0.15s;
  }
  .choice:hover {
    background: var(--surface); border-color: var(--accent);
  }
  #ending {
    margin-top: 48px; padding: 32px 24px;
    background: linear-gradient(135deg, #3d3427 0%, #2a231a 100%);
    border: 1px solid var(--accent); border-radius: 10px;
    text-align: center;
  }
  #ending .label {
    font-size: 11px; color: var(--accent);
    letter-spacing: 3px; text-transform: uppercase;
    font-family: ui-monospace, monospace; margin-bottom: 12px;
  }
  #ending .name {
    font-family: Georgia, "Songti SC", serif;
    font-size: 24px; font-weight: 600;
    color: var(--fg); letter-spacing: 1px; margin-bottom: 24px;
  }
  #ending button {
    padding: 8px 24px; font-size: 13px;
    background: var(--accent); color: #1a1612;
    border: none; border-radius: 6px;
    font-family: inherit; font-weight: 600;
    cursor: pointer;
  }
  #ending button:hover { opacity: 0.9; }
  .empty {
    color: var(--fg-muted); font-style: italic;
    padding: 32px 0; text-align: center;
  }
</style>
</head>
<body>
<div id="stage">
  <h1 id="title"></h1>
  <div class="desc" id="desc"></div>
  <div id="scene-host"></div>
  <div id="choices"></div>
  <div id="ending-host"></div>
</div>
<div class="hint" id="hint">点击继续 ▼</div>

<script>
const DATA = __DATA__;

/* 剧本引擎：与预览共用同一份 TS 实现（src/features/story/engine），
   由 scripts/build-reader-runtime.mjs 打包成 IIFE 内联到这里。
   本文件不再持有任何剧本语法/求值逻辑。 */
__RUNTIME__

/* 阅读器：解析全部文件、推变量表、定入口 knot，全部交给引擎。 */
const READER = AnvilReader.createReader(DATA);

/* ============ 渲染 ============ */
let titleEl, descEl, sceneHost, choicesEl, endingHost, hintEl, bgEl;
let phase = "line";
let typewriter = null;
let runtimeState = null;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderBackground() {
  if (bgEl) { bgEl.remove(); bgEl = null; }
  if (!runtimeState || !runtimeState.bg) return;
  const src = DATA.assets[runtimeState.bg];
  if (!src) return;
  bgEl = el("img", "scene-bg");
  bgEl.src = src;
  bgEl.alt = "";
  sceneHost.insertBefore(bgEl, sceneHost.firstChild);
}

function startTypewriter(text, textEl) {
  let idx = 0;
  textEl.textContent = "";
  const interval = setInterval(() => {
    if (idx >= text.length) {
      clearInterval(interval);
      typewriter = null;
      return;
    }
    idx++;
    textEl.textContent = text.slice(0, idx);
  }, 30);
  typewriter = {
    skip() {
      clearInterval(interval);
      textEl.textContent = text;
      typewriter = null;
    }
  };
}

function createLineEl(line) {
  const div = document.createElement("div");
  div.className = "line " + line.type;
  if (line.type === "say") {
    const src = portraitFor(line.speaker, line.portrait);
    if (src) {
      const av = document.createElement("img");
      av.className = "avatar";
      av.src = src;
      av.alt = "";
      div.appendChild(av);
    }
    const sp = document.createElement("span");
    sp.className = "speaker";
    sp.textContent = line.speaker + "：";
    div.appendChild(sp);
    const t = document.createElement("span");
    div.appendChild(t);
    return { el: div, textEl: t };
  }
  if (line.type === "bgm" || line.type === "sfx") {
    const prefix = line.type === "bgm" ? "[音乐] " : "[音效] ";
    div.textContent = prefix + line.file;
    return { el: div, textEl: null };
  }
  return { el: div, textEl: div };
}

/* 说话人（卡名）+ 表情 → 立绘 data URL。与运行时 portraitLookup 一致。 */
function portraitFor(speaker, emotion) {
  const p = DATA.portraits && DATA.portraits[speaker];
  if (!p) return null;
  if (emotion && p.emotions && p.emotions[emotion]) return p.emotions[emotion];
  return p.default || null;
}

/* 显示一行。粘合（`<>`）已由引擎合并进 text，这里不再二次拼接。 */
function displayLine(line) {
  const { el: lineEl, textEl } = createLineEl(line);
  sceneHost.appendChild(lineEl);
  lineEl.scrollIntoView({ behavior: "smooth", block: "end" });
  if (!textEl) return;
  startTypewriter(line.text || "", textEl);
}

function showEnding() {
  phase = "ending";
  choicesEl.innerHTML = "";
  endingHost.innerHTML = "";
  const fm = READER.frontmatter(runtimeState.file);
  const box = el("div");
  box.id = "ending";
  box.appendChild(el("div", "label", "— 结局 —"));
  box.appendChild(el("div", "name", (fm.is_ending && fm.ending_name) ? fm.ending_name : "故事到此结束"));
  const btn = el("button", null, "重新开始");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    restart();
  });
  box.appendChild(btn);
  endingHost.appendChild(box);
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showChoices() {
  phase = "choices";
  choicesEl.innerHTML = "";
  const seen = new Set();
  for (const c of runtimeState.choices) {
    if (seen.has(c.label)) continue;
    seen.add(c.label);
    const btn = el("button", "choice", c.label);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (phase !== "choices") return;
      runtimeState = READER.choose(c.index);
      phase = "line";
      choicesEl.innerHTML = "";
      pump();
    });
    choicesEl.appendChild(btn);
  }
}

/* 推进到下一个可显示点 */
function pump() {
  for (;;) {
    const result = READER.continue();
    if (result.error) {
      phase = "error";
      sceneHost.appendChild(el("div", "empty", "（" + result.error + "）"));
      return;
    }
    runtimeState = result.state;
    renderBackground();
    if (runtimeState.ended) { showEnding(); return; }
    if (runtimeState.choices.length > 0) { showChoices(); return; }
    if (runtimeState.displayLine) {
      displayLine(runtimeState.displayLine);
      runtimeState.displayLine = null;
      phase = "line";
      return;
    }
    /* ended=false 且无显示行且无选项：不该发生，防御性退出 */
    return;
  }
}

function advance() {
  if (phase !== "line") return;
  if (typewriter) { typewriter.skip(); return; }
  pump();
}

function restart() {
  sceneHost.innerHTML = "";
  choicesEl.innerHTML = "";
  endingHost.innerHTML = "";
  bgEl = null;
  const init = READER.reset();
  if (init.error) {
    phase = "error";
    sceneHost.appendChild(el("div", "empty", "（" + init.error + "）"));
    return;
  }
  runtimeState = init.state;
  phase = "line";
  renderBackground();
  pump();
}

/* ============ 主入口 ============ */
function main() {
  titleEl = document.getElementById("title");
  descEl = document.getElementById("desc");
  sceneHost = document.getElementById("scene-host");
  choicesEl = document.getElementById("choices");
  endingHost = document.getElementById("ending-host");
  hintEl = document.getElementById("hint");

  titleEl.textContent = DATA.scenario.name;
  descEl.textContent = DATA.scenario.description || "";

  restart();

  document.body.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("#choices")) return;
    if (e.target.closest && e.target.closest("#ending-host")) return;
    advance();
  });

  document.body.addEventListener("mousemove", () => {
    if (phase === "line") hintEl.classList.add("show");
  });
}

main();
</script>
</body>
</html>
"##;

/// 剧本引擎（唯一 TS 实现）的打包产物，见 scripts/build-reader-runtime.mjs。
///
/// 用 include_str! 而不是运行时读取：导出件必须能离线打开，且语义实现
/// 必须在编译期固化进二进制，避免「装了个旧版 app 导出新语法」的漂移。
const READER_RUNTIME: &str = include_str!("reader_runtime.js");

fn render_html(data: &ExportData) -> anyhow::Result<String> {
    let json = serde_json::to_string(data)?.replace("</", "<\\/");
    let title = html_escape(&data.scenario.name);
    Ok(fill_template(
        HTML_TEMPLATE,
        &[
            ("__TITLE__", title.as_str()),
            ("__DATA__", json.as_str()),
            ("__RUNTIME__", READER_RUNTIME),
        ],
    ))
}

/// 单遍替换占位符：插入的值不再被扫描。
///
/// 链式 `String::replace` 会把剧情文本里出现的 `__RUNTIME__` 当成模板占位符
/// 再插一遍（把整段 JS 塞进 JSON 字符串里），单遍替换从根上避免这件事。
fn fill_template(template: &str, values: &[(&str, &str)]) -> String {
    let mut out = String::with_capacity(template.len());
    let mut rest = template;
    loop {
        let hit = values
            .iter()
            .filter_map(|(key, val)| rest.find(key).map(|idx| (idx, *key, *val)))
            .min_by_key(|(idx, _, _)| *idx);
        let Some((idx, key, val)) = hit else { break };
        out.push_str(&rest[..idx]);
        out.push_str(val);
        rest = &rest[idx + key.len()..];
    }
    out.push_str(rest);
    out
}

#[cfg(test)]
mod tests {
    use super::{fill_template, HTML_TEMPLATE, READER_RUNTIME};

    #[test]
    fn fill_template_does_not_rescan_inserted_values() {
        let out = fill_template(
            "a=__DATA__ b=__RUNTIME__",
            &[("__DATA__", "__RUNTIME__"), ("__RUNTIME__", "<js>")],
        );
        assert_eq!(out, "a=__RUNTIME__ b=<js>");
    }

    #[test]
    fn template_slot_and_engine_bundle_are_wired() {
        assert!(HTML_TEMPLATE.contains("__RUNTIME__"));
        assert!(HTML_TEMPLATE.contains("AnvilReader.createReader(DATA)"));
        // 产物必须带 reader 工厂：模板完全依赖它，缺了导出件就是白屏
        assert!(READER_RUNTIME.contains("createReader"));
        // 语义实现不应再出现在 Rust 模板里
        assert!(!HTML_TEMPLATE.contains("function continueStep("));
        assert!(!HTML_TEMPLATE.contains("function parseScript("));
    }
}
