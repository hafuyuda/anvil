use super::project::Project;
use crate::core::model::card_type::{CardType, FieldType};
use crate::core::model::relation::Relation;
use crate::core::model::scenario::{Scenario, VariableDef};
use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Serialize)]
struct ExportData {
    title: String,
    description: Option<String>,
    entry: Option<String>,
    variables: Vec<VariableDef>,
    nodes: BTreeMap<String, ExportNode>,
    edges: Vec<ExportEdge>,
    assets: BTreeMap<String, String>,
}

#[derive(Serialize)]
struct ExportNode {
    name: String,
    type_name: String,
    values: serde_json::Value,
    script_md: Option<String>,
}

#[derive(Serialize)]
struct ExportEdge {
    from: String,
    to: String,
    kind: String,
    label: Option<String>,
    condition: String,
    effects: Vec<String>,
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

        let card_types = self.load_card_types()?;
        let all_relations = self.list_all_relations()?;

        let data = self.collect_export_data(scenario, &card_types, &all_relations)?;
        let html = render_html(&data)?;

        std::fs::write(output_path, html)?;
        Ok(())
    }

    fn collect_export_data(
        &self,
        scenario: &Scenario,
        card_types: &[CardType],
        all_relations: &[Relation],
    ) -> anyhow::Result<ExportData> {
        let mut nodes = BTreeMap::new();
        let mut assets: BTreeMap<String, String> = BTreeMap::new();

        let node_id_set: std::collections::HashSet<String> =
            scenario.node_ids.iter().cloned().collect();

        for node_id in &scenario.node_ids {
            let card = match self.load_card(node_id) {
                Ok(c) => c,
                Err(_) => continue,
            };
            let card_type = card_types.iter().find(|t| t.id == card.type_id);
            let type_name = card_type
                .map(|t| t.name.clone())
                .unwrap_or_else(|| "未知".into());

            if let Some(ct) = card_type {
                for f in &ct.fields {
                    if f.deprecated {
                        continue;
                    }
                    if !matches!(f.ty, FieldType::Image) {
                        continue;
                    }
                    if let Some(v) = card.values.get(&f.key) {
                        if let Some(path) = v.as_str() {
                            if !path.is_empty() && !assets.contains_key(path) {
                                if let Ok(url) = self.read_image_data_url(path) {
                                    assets.insert(path.to_string(), url);
                                }
                            }
                        }
                    }
                }
            }

            let script_md = self.load_script(node_id).ok().flatten();

            if let Some(ref md) = script_md {
                if let Some(bg_path) = extract_frontmatter_value(md, "bg") {
                    if !assets.contains_key(&bg_path) {
                        if let Ok(url) = self.read_image_data_url(&bg_path) {
                            assets.insert(bg_path, url);
                        }
                    }
                }
            }

            nodes.insert(
                node_id.clone(),
                ExportNode {
                    name: card.name.clone(),
                    type_name,
                    values: serde_json::to_value(&card.values)?,
                    script_md,
                },
            );
        }

        let edges: Vec<ExportEdge> = all_relations
            .iter()
            .filter(|r| {
                r.meta.get("scenario_id").and_then(|v| v.as_str()) == Some(&scenario.id)
                    && node_id_set.contains(&r.from)
                    && node_id_set.contains(&r.to)
            })
            .map(|r| {
                let condition = r
                    .meta
                    .get("condition")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let effects = r
                    .meta
                    .get("effects")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|x| x.as_str().map(|s| s.to_string()))
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default();
                ExportEdge {
                    from: r.from.clone(),
                    to: r.to.clone(),
                    kind: r.kind.clone(),
                    label: r.label.clone(),
                    condition,
                    effects,
                }
            })
            .collect();

        Ok(ExportData {
            title: scenario.name.clone(),
            description: scenario.description.clone(),
            entry: scenario.entry_node.clone(),
            variables: scenario.variables.clone(),
            nodes,
            edges,
            assets,
        })
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
  .scene-title {
    font-family: Georgia, "Songti SC", serif;
    font-size: 20px; color: var(--accent);
    margin: 32px 0 20px; padding-bottom: 8px;
    border-bottom: 1px solid var(--surface);
  }
  .scene-bg {
    width: 100%; max-height: 400px; object-fit: cover;
    border-radius: 8px; margin-bottom: 24px; display: block;
    background: var(--panel);
  }
  #scene-host { min-height: 100px; }
  .line { margin-bottom: 14px; line-height: 1.8; }
  .line.narration, .line.action { font-style: italic; color: var(--fg-dim); }
  .line.say .speaker {
    color: var(--accent); font-weight: 600; margin-right: 4px;
    font-family: Georgia, "Songti SC", serif;
  }
  .line.bgm, .line.sfx {
    font-family: ui-monospace, monospace; font-size: 12px;
    color: var(--fg-muted); padding: 4px 8px;
    background: var(--panel); border-radius: 4px; display: inline-block;
  }
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
  .choice:hover:not(:disabled) {
    background: var(--surface); border-color: var(--accent);
  }
  .choice:disabled { opacity: 0.4; cursor: not-allowed; }
  .choice .target { float: right; font-size: 12px; color: var(--fg-muted); }
  .choice .effects {
    display: block; font-family: ui-monospace, monospace;
    font-size: 11px; color: var(--fg-muted); margin-top: 4px;
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

/* ============ 骰子 ============ */
function rollDice(expr) {
  const trimmed = String(expr).trim();
  const num = Number(trimmed);
  if (!isNaN(num)) return { expr: trimmed, result: num, detail: [num], isRoll: false };
  const m = trimmed.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!m) return null;
  const count = m[1] ? Number(m[1]) : 1;
  const face = Number(m[2]);
  const mod = m[3] ? Number(m[3]) : 0;
  if (count < 1 || count > 100 || face < 2 || face > 1000) return null;
  const detail = [];
  for (let i = 0; i < count; i++) detail.push(Math.floor(Math.random() * face) + 1);
  const sum = detail.reduce((a, b) => a + b, 0);
  return { expr: trimmed, result: sum + mod, detail };
}

/* ============ 表达式求值 ============ */
function tokenizeExpr(s) {
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      tokens.push({ t: "num", v: parseFloat(s.slice(i, j)) });
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      let str = "";
      while (j < s.length && s[j] !== q) {
        if (s[j] === "\\" && j + 1 < s.length) { str += s[j + 1]; j += 2; }
        else { str += s[j]; j++; }
      }
      tokens.push({ t: "str", v: str });
      i = j + 1;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      const name = s.slice(i, j);
      if (name === "true") tokens.push({ t: "bool", v: true });
      else if (name === "false") tokens.push({ t: "bool", v: false });
      else tokens.push({ t: "ident", v: name });
      i = j;
      continue;
    }
    const two = s.slice(i, i + 2);
    if (two === "==" || two === "!=" || two === ">=" || two === "<=" || two === "&&" || two === "||") {
      tokens.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/!<>()".includes(c)) {
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    i++;
  }
  return tokens;
}

function evalExpr(expr, vars) {
  const tokens = tokenizeExpr(expr);
  let pos = 0;
  function peek() { return tokens[pos]; }
  function eat(v) {
    const t = tokens[pos];
    if (!t || (v && t.v !== v)) throw new Error("unexpected");
    pos++;
    return t;
  }
  function parseOr() {
    let left = parseAnd();
    while (peek() && peek().v === "||") {
      eat("||");
      left = Boolean(left) || Boolean(parseAnd());
    }
    return left;
  }
  function parseAnd() {
    let left = parseCmp();
    while (peek() && peek().v === "&&") {
      eat("&&");
      left = Boolean(left) && Boolean(parseCmp());
    }
    return left;
  }
  function parseCmp() {
    let left = parseAdd();
    while (peek() && ["==", "!=", ">", ">=", "<", "<="].includes(peek().v)) {
      const op = eat().v;
      const right = parseAdd();
      switch (op) {
        case "==": left = left === right; break;
        case "!=": left = left !== right; break;
        case ">":  left = left >  right; break;
        case ">=": left = left >= right; break;
        case "<":  left = left <  right; break;
        case "<=": left = left <= right; break;
      }
    }
    return left;
  }
  function parseAdd() {
    let left = parseMul();
    while (peek() && (peek().v === "+" || peek().v === "-")) {
      const op = eat().v;
      const right = parseMul();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }
  function parseMul() {
    let left = parseUnary();
    while (peek() && (peek().v === "*" || peek().v === "/")) {
      const op = eat().v;
      const right = parseUnary();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }
  function parseUnary() {
    if (peek() && peek().v === "!") { eat("!"); return !parseUnary(); }
    if (peek() && peek().v === "-") { eat("-"); return -parseUnary(); }
    return parseAtom();
  }
  function parseAtom() {
    const t = peek();
    if (!t) throw new Error("end");
    if (t.t === "num" || t.t === "str" || t.t === "bool") { pos++; return t.v; }
    if (t.t === "ident") { pos++; return vars[t.v]; }
    if (t.v === "(") { eat("("); const v = parseOr(); eat(")"); return v; }
    throw new Error("unexpected " + t.v);
  }
  return parseOr();
}

function tryEval(expr, vars) {
  const trimmed = String(expr).trim();
  if (!trimmed) return true;
  try { return Boolean(evalExpr(trimmed, vars)); }
  catch (e) { return false; }
}

/* ============ 效果执行 ============ */
function parseValue(raw, vars) {
  const t = String(raw).trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  const dice = rollDice(t);
  if (dice) return dice.result;
  const n = Number(t);
  if (!isNaN(n)) return n;
  if (vars[t] !== undefined) return vars[t];
  return t;
}

function applyEffect(effect, vars) {
  const m = String(effect).match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(\+=|-=|=)\s*(.+)$/);
  if (!m) return;
  const [, key, op, rawVal] = m;
  const value = parseValue(rawVal, vars);
  if (op === "=") vars[key] = value;
  else if (op === "+=") vars[key] = (Number(vars[key]) || 0) + Number(value);
  else if (op === "-=") vars[key] = (Number(vars[key]) || 0) - Number(value);
}

/* ============ 剧本解析 ============ */
function parseScript(md) {
  const lines = md.split(/\r?\n/);
  let i = 0;
  const fm = {};
  if (lines[0] && lines[0].trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") {
      const m = lines[i].match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
      if (m) {
        let raw = m[2].trim();
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
          raw = raw.slice(1, -1);
        }
        fm[m[1]] = raw;
      }
      i++;
    }
    if (i < lines.length) i++;
  }
  const out = [];
  while (i < lines.length) {
    const line = lines[i].trim();
    i++;
    if (!line) continue;
    const at = line.match(/^@(bg|bgm|sfx)\s+(.+)$/);
    if (at) {
      if (at[1] === "bg") out.push({ type: "bg", image: at[2].trim() });
      else out.push({ type: at[1], file: at[2].trim() });
      continue;
    }
    if (line.startsWith("> ") || line === ">") {
      out.push({ type: "narration", text: line.slice(1).trim() });
      continue;
    }
    const say = line.match(/^\*\*([^*]+)\*\*(?:\s*[（(]([^）)]*)[）)])?\s*[:：]\s*(.*)$/);
    if (say) {
      out.push({
        type: "say",
        speaker: say[1].trim(),
        portrait: say[2] ? say[2].trim() : null,
        text: say[3] || ""
      });
      continue;
    }
    const action = line.match(/^\*(.+)\*$/);
    if (action) {
      out.push({ type: "action", text: action[1].trim() });
      continue;
    }
    out.push({ type: "narration", text: line });
  }
  return { frontmatter: fm, lines: out };
}

/* ============ 状态 ============ */
const state = {
  sceneId: null,
  lineIdx: 0,
  vars: {},
  lines: [],
  currentBg: null,
  isEnding: false,
  endingName: null,
  phase: "line",
  typewriter: null,
};

let titleEl, descEl, sceneHost, choicesEl, endingHost, hintEl;

function initVars() {
  state.vars = {};
  for (const v of DATA.variables) {
    state.vars[v.key] = v.default !== undefined && v.default !== null ? v.default : null;
  }
}

/* ============ 打字机 ============ */
function startTypewriter(text, textEl) {
  let idx = 0;
  textEl.textContent = "";
  const interval = setInterval(() => {
    if (idx >= text.length) {
      clearInterval(interval);
      state.typewriter = null;
      return;
    }
    idx++;
    textEl.textContent = text.slice(0, idx);
  }, 30);
  state.typewriter = {
    skip() {
      clearInterval(interval);
      textEl.textContent = text;
      state.typewriter = null;
    }
  };
}

/* ============ 渲染 ============ */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderBackground() {
  const old = sceneHost.querySelector(".scene-bg");
  if (old) old.remove();
  if (!state.currentBg) return;
  const src = DATA.assets[state.currentBg];
  if (!src) return;
  const img = document.createElement("img");
  img.className = "scene-bg";
  img.src = src;
  img.alt = "";
  sceneHost.insertBefore(img, sceneHost.firstChild);
}

function createLineEl(line) {
  const div = document.createElement("div");
  div.className = "line " + line.type;
  if (line.type === "say") {
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

/* ============ 流程 ============ */
function startScene(sceneId) {
  state.sceneId = sceneId;
  state.lineIdx = 0;
  state.currentBg = null;
  state.isEnding = false;
  state.endingName = null;
  state.phase = "line";
  if (state.typewriter) state.typewriter.skip();
  choicesEl.innerHTML = "";
  endingHost.innerHTML = "";
  sceneHost.innerHTML = "";

  const node = DATA.nodes[sceneId];
  if (!node) {
    sceneHost.appendChild(el("div", "empty", "（找不到场景）"));
    return;
  }

  const st = document.createElement("div");
  st.className = "scene-title";
  st.textContent = node.name;
  sceneHost.appendChild(st);

  if (node.script_md) {
    const parsed = parseScript(node.script_md);
    state.lines = parsed.lines;
    if (parsed.frontmatter.bg) state.currentBg = parsed.frontmatter.bg;
    state.isEnding = parsed.frontmatter.is_ending === "true";
    state.endingName = parsed.frontmatter.ending_name || null;
  } else {
    state.lines = [];
    const v = node.values || {};
    if (typeof v.description === "string" && v.description.trim()) {
      state.lines.push({ type: "narration", text: v.description });
    }
    if (typeof v.dialogue === "string" && v.dialogue.trim()) {
      state.lines.push({ type: "narration", text: v.dialogue });
    }
  }

  renderBackground();
  showNextLine();
}

function showNextLine() {
  while (state.lineIdx < state.lines.length) {
    const line = state.lines[state.lineIdx];
    if (line.type === "bg") {
      state.currentBg = line.image;
      renderBackground();
      state.lineIdx++;
      continue;
    }
    if (line.type === "bgm" || line.type === "sfx") {
      const { el: sysEl } = createLineEl(line);
      sceneHost.appendChild(sysEl);
      state.lineIdx++;
      continue;
    }
    break;
  }

  if (state.lineIdx >= state.lines.length) {
    if (state.isEnding) showEnding();
    else showChoices();
    return;
  }

  const line = state.lines[state.lineIdx];
  const { el: lineEl, textEl } = createLineEl(line);
  sceneHost.appendChild(lineEl);
  lineEl.scrollIntoView({ behavior: "smooth", block: "end" });
  if (textEl) startTypewriter(line.text || "", textEl);
}

function advance() {
  if (state.phase !== "line") return;
  if (state.typewriter) { state.typewriter.skip(); return; }
  state.lineIdx++;
  showNextLine();
}

function showChoices() {
  state.phase = "choices";
  const edges = DATA.edges.filter((e) => e.from === state.sceneId);
  if (edges.length === 0) { showEnding(); return; }
  choicesEl.innerHTML = "";
  for (const edge of edges) {
    const ok = tryEval(edge.condition, state.vars);
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.disabled = !ok;
    const label = edge.label || edge.kind;
    const targetName = DATA.nodes[edge.to] ? DATA.nodes[edge.to].name : edge.to.slice(0, 8);
    btn.textContent = label;
    const tgt = document.createElement("span");
    tgt.className = "target";
    tgt.textContent = "→ " + targetName;
    btn.appendChild(tgt);
    if (edge.effects.length > 0) {
      const eff = document.createElement("span");
      eff.className = "effects";
      eff.textContent = "效果：" + edge.effects.join(" · ");
      btn.appendChild(eff);
    }
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!ok) return;
      for (const ef of edge.effects) applyEffect(ef, state.vars);
      startScene(edge.to);
    });
    choicesEl.appendChild(btn);
  }
}

function showEnding() {
  state.phase = "ending";
  choicesEl.innerHTML = "";
  endingHost.innerHTML = "";
  const box = document.createElement("div");
  box.id = "ending";
  const lbl = document.createElement("div");
  lbl.className = "label";
  lbl.textContent = "— 结局 —";
  box.appendChild(lbl);
  const name = document.createElement("div");
  name.className = "name";
  name.textContent = state.endingName || "故事到此结束";
  box.appendChild(name);
  const btn = document.createElement("button");
  btn.textContent = "重新开始";
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    initVars();
    endingHost.innerHTML = "";
    startScene(DATA.entry);
  });
  box.appendChild(btn);
  endingHost.appendChild(box);
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ============ 主入口 ============ */
function main() {
  titleEl = document.getElementById("title");
  descEl = document.getElementById("desc");
  sceneHost = document.getElementById("scene-host");
  choicesEl = document.getElementById("choices");
  endingHost = document.getElementById("ending-host");
  hintEl = document.getElementById("hint");

  titleEl.textContent = DATA.title;
  descEl.textContent = DATA.description || "";

  initVars();

  if (!DATA.entry || !DATA.nodes[DATA.entry]) {
    sceneHost.appendChild(el("div", "empty", "（没有入口节点）"));
    return;
  }

  startScene(DATA.entry);

  document.body.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("#choices")) return;
    if (e.target.closest && e.target.closest("#ending-host")) return;
    if (state.phase !== "line") return;
    advance();
  });

  document.body.addEventListener("mousemove", () => {
    if (state.phase === "line") hintEl.classList.add("show");
  });
}

main();
</script>
</body>
</html>
"##;

fn render_html(data: &ExportData) -> anyhow::Result<String> {
    let json = serde_json::to_string(data)?;
    let json_safe = json.replace("</", "<\\/");
    let title = html_escape(&data.title);
    Ok(HTML_TEMPLATE
        .replace("__TITLE__", &title)
        .replace("__DATA__", &json_safe))
}