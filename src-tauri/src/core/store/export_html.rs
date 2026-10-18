use super::project::Project;
use crate::core::model::card_type::FieldType;
use crate::core::model::scenario::{Scenario, VariableDef};
use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Serialize)]
struct ExportData {
    scenario: ExportScenario,
    /// 文件名（字典序）→ 原始行与 knot 索引
    files: BTreeMap<String, ExportFile>,
    /// 全局 knot 名 → 所在文件与行号
    knots: BTreeMap<String, ExportKnotRef>,
    variables: Vec<VariableDef>,
    /// 背景图路径 → data URL
    assets: BTreeMap<String, String>,
}

#[derive(Serialize)]
struct ExportScenario {
    name: String,
    description: Option<String>,
    entry_knot: Option<String>,
}

#[derive(Serialize)]
struct ExportFile {
    lines: Vec<String>,
    knots: BTreeMap<String, usize>,
}

#[derive(Serialize)]
struct ExportKnotRef {
    file: String,
    pc: usize,
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
        let mut files = BTreeMap::new();
        let mut knots: BTreeMap<String, ExportKnotRef> = BTreeMap::new();
        let mut assets: BTreeMap<String, String> = BTreeMap::new();
        // (key, literal)，首次声明生效
        let mut vars: Vec<(String, String)> = Vec::new();

        // list_script_files 按文件名字典序返回
        for filename in self.list_script_files(&scenario.id)? {
            let Some(content) = self.load_script(&scenario.id, &filename)? else {
                continue;
            };

            if let Some(bg) = extract_frontmatter_value(&content, "bg") {
                self.embed_asset(&mut assets, &bg);
            }

            let raw_lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
            let mut file_knots: BTreeMap<String, usize> = BTreeMap::new();

            for (idx, raw) in raw_lines.iter().enumerate() {
                let t = raw.trim();

                if let Some(rest) = t.strip_prefix("===") {
                    let name = rest.trim();
                    if !name.is_empty() {
                        file_knots.insert(name.to_string(), idx);
                    }
                    continue;
                }

                if let Some(rest) = t.strip_prefix("@bg ") {
                    self.embed_asset(&mut assets, rest.trim());
                    continue;
                }

                if let Some((key, literal)) = parse_var_line(t) {
                    if !vars.iter().any(|(k, _)| k == &key) {
                        vars.push((key, literal));
                    }
                }
            }

            for (name, pc) in &file_knots {
                knots.insert(
                    name.clone(),
                    ExportKnotRef {
                        file: filename.clone(),
                        pc: *pc,
                    },
                );
            }

            files.insert(
                filename.clone(),
                ExportFile {
                    lines: raw_lines,
                    knots: file_knots,
                },
            );
        }

        // entry_knot 为空 → 文件名字典序第一个文件的第一个 knot
        let entry_knot = scenario.entry_knot.clone().or_else(|| {
            files.values().find_map(|f| {
                f.knots
                    .iter()
                    .next()
                    .map(|(name, _)| name.clone())
            })
        });

        let variables = vars
            .iter()
            .map(|(k, lit)| var_to_def(k, lit))
            .collect();

        Ok(ExportData {
            scenario: ExportScenario {
                name: scenario.name.clone(),
                description: scenario.description.clone(),
                entry_knot,
            },
            files,
            knots,
            variables,
            assets,
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

fn parse_var_line(line: &str) -> Option<(String, String)> {
    let rest = line.strip_prefix("VAR")?;
    let rest = rest.trim_start();
    let (key, value) = rest.split_once('=')?;
    let key = key.trim();
    let first = key.chars().next()?;
    if !(first.is_ascii_alphabetic() || first == '_') {
        return None;
    }
    if !key.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
        return None;
    }
    Some((key.to_string(), value.trim().to_string()))
}

fn var_to_def(key: &str, literal: &str) -> VariableDef {
    let lit = literal.trim();
    if let Ok(n) = lit.parse::<f64>() {
        return VariableDef {
            key: key.to_string(),
            label: key.to_string(),
            ty: FieldType::Number,
            default: Some(serde_json::json!(n)),
        };
    }
    if lit == "true" || lit == "false" {
        return VariableDef {
            key: key.to_string(),
            label: key.to_string(),
            ty: FieldType::Bool,
            default: Some(serde_json::json!(lit == "true")),
        };
    }
    VariableDef {
        key: key.to_string(),
        label: key.to_string(),
        ty: FieldType::Text,
        default: Some(serde_json::json!(lit.trim_matches('"').trim_matches('\''))),
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

/* ============ 骰子 ============ */
function rollDice(expr) {
  const trimmed = String(expr).trim();
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== "") return { expr: trimmed, result: num, detail: [num], isRoll: false };
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

/* ============ 表达式求值（builtins 支持 visited_） ============ */
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

function evalExpr(expr, values, builtins) {
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
    if (t.t === "ident") {
      pos++;
      if (t.v in values) return values[t.v];
      if (builtins && t.v in builtins) return builtins[t.v];
      return undefined;
    }
    if (t.v === "(") { eat("("); const v = parseOr(); eat(")"); return v; }
    throw new Error("unexpected " + t.v);
  }
  return parseOr();
}

function tryCond(expr, values, builtins) {
  const trimmed = String(expr).trim();
  if (!trimmed) return true;
  try { return Boolean(evalExpr(trimmed, values, builtins)); }
  catch (e) { return false; }
}

/* ============ 赋值 ============ */
function applyAssign(key, op, rawVal, values) {
  const t = String(rawVal).trim();
  let value;
  if (t === "true") value = true;
  else if (t === "false") value = false;
  else if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) value = t.slice(1, -1);
  else {
    const dice = rollDice(t);
    if (dice) value = dice.result;
    else {
      const n = Number(t);
      value = !isNaN(n) && t !== "" ? n : (values[t] !== undefined ? values[t] : t);
    }
  }
  if (op === "=") values[key] = value;
  else if (op === "+=") values[key] = (Number(values[key]) || 0) + Number(value);
  else if (op === "-=") values[key] = (Number(values[key]) || 0) - Number(value);
}

/* ============ 剧本解析（weave 语法） ============ */
function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}

/* 扫描文本中的 {expr: A|B} 跨度（| 不在双引号内时才是分隔符） */
function scanInlineConds(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open === -1) break;
    const close = text.indexOf("}", open + 1);
    if (close === -1) break;
    const cond = parseInlineInner(text.slice(open + 1, close));
    if (cond) out.push(cond);
    i = close + 1;
  }
  return out;
}

/* 花括号内部分割。无 | 返回 null（整行条件场景）。 */
function parseInlineInner(inner) {
  let colon = -1, inStr = false;
  for (let j = 0; j < inner.length; j++) {
    const ch = inner[j];
    if (ch === '"') inStr = !inStr;
    else if (ch === ":" && !inStr) { colon = j; break; }
  }
  if (colon === -1) return null;
  const expr = inner.slice(0, colon).trim();
  if (!expr) return null;
  let pipe = -1;
  inStr = false;
  for (let j = colon + 1; j < inner.length; j++) {
    const ch = inner[j];
    if (ch === '"') inStr = !inStr;
    else if (ch === "|" && !inStr) { pipe = j; break; }
  }
  if (pipe === -1) return null;
  return { expr, then: inner.slice(colon + 1, pipe).trim(), else: inner.slice(pipe + 1).trim() };
}

/* 整行条件：第一个不在双引号内的冒号分割 */
function parseConditionBody(inner) {
  let inStr = false;
  for (let j = 0; j < inner.length; j++) {
    const ch = inner[j];
    if (ch === '"') inStr = !inStr;
    else if (ch === ":" && !inStr) {
      const expr = inner.slice(0, j).trim();
      if (!expr) return null;
      return { expr, text: inner.slice(j + 1).trim() };
    }
  }
  const expr = inner.trim();
  return expr ? { expr, text: "" } : null;
}

function withInline(line) {
  if (line.type !== "narration" && line.type !== "say" && line.type !== "action") return line;
  const inline = scanInlineConds(line.text);
  return inline.length > 0 ? Object.assign({}, line, { inline }) : line;
}

function parseScript(src) {
  const lines = src.split(/\r?\n/);
  let i = 0;
  const frontmatter = {};
  if (lines[0] && lines[0].trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") {
      const m = lines[i].match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
      if (m) {
        const key = m[1];
        const raw = m[2].trim();
        if (key === "is_ending") frontmatter.is_ending = raw === "true";
        else if (key === "ending_name") frontmatter.ending_name = stripQuotes(raw);
        else if (key === "bg") frontmatter.bg = stripQuotes(raw);
        else if (key === "bgm") frontmatter.bgm = stripQuotes(raw);
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

    const knot = line.match(/^===\s*(.+?)\s*$/);
    if (knot) { out.push({ type: "knot", name: knot[1] }); continue; }

    const varDecl = line.match(/^VAR\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    if (varDecl) { out.push({ type: "var", key: varDecl[1], literal: varDecl[2].trim() }); continue; }

    if (line === "<>") { out.push({ type: "glue" }); continue; }

    const jump = line.match(/^->\s*(.+)$/);
    if (jump) { out.push({ type: "jump", target: jump[1].trim() }); continue; }

    const at = line.match(/^@(bg|bgm|sfx|scene|actor)\s+(.+)$/);
    if (at) {
      const kind = at[1], value = at[2].trim();
      if (kind === "bg") out.push({ type: "bg", image: value });
      else if (kind === "bgm" || kind === "sfx") out.push({ type: kind, file: value });
      else out.push({ type: kind === "scene" ? "scene_ref" : "actor_ref", cardName: value });
      continue;
    }

    if (line.startsWith("> ") || line === ">") {
      out.push(withInline({ type: "narration", text: line.slice(1).trim() }));
      continue;
    }

    const say = line.match(/^\*\*([^*]+)\*\*(?:\s*[（(]([^）)]*)[）)])?\s*[:：]\s*(.*)$/);
    if (say) {
      out.push(withInline({
        type: "say",
        speaker: say[1].trim(),
        portrait: say[2] ? say[2].trim() : undefined,
        text: say[3] || ""
      }));
      continue;
    }

    if (line.startsWith("{") && line.endsWith("}")) {
      const inner = line.slice(1, -1);
      const inline = parseInlineInner(inner);
      if (inline) {
        out.push({ type: "narration", text: line, inline: [inline] });
        continue;
      }
      const cond = parseConditionBody(inner);
      if (cond) { out.push({ type: "condition", expr: cond.expr, text: cond.text }); continue; }
    }

    const assign = line.match(/^~\s*(\S+?)\s*(\+=|-=|=)\s*(.+)$/);
    if (assign) {
      out.push({ type: "assign", key: assign[1], op: assign[2], value: assign[3].trim() });
      continue;
    }

    const choice = line.match(/^\*\s+(.+)$/);
    if (choice) { out.push({ type: "choice", label: choice[1].trim() }); continue; }

    const action = line.match(/^\*(.+)\*$/);
    if (action) { out.push(withInline({ type: "action", text: action[1].trim() })); continue; }

    const gather = line.match(/^-(?:\s+(.*))?$/);
    if (gather) { out.push({ type: "gather", text: (gather[1] || "").trim() }); continue; }

    out.push(withInline({ type: "narration", text: line }));
  }

  const knots = {};
  out.forEach((l, idx) => { if (l.type === "knot") knots[l.name] = idx; });
  const vars = [];
  out.forEach((l) => { if (l.type === "var" && !vars.some((v) => v.key === l.key)) vars.push({ key: l.key, literal: l.literal }); });

  /* choice 组：连续 * 行；body 到下一个 * / - / === 前；gatherPc 是组后第一个 - 行 */
  const choiceGroups = {};
  let gi = 0;
  while (gi < out.length) {
    if (out[gi].type !== "choice") { gi++; continue; }
    const groupStart = gi;
    const choices = [];
    let j = gi, terminated = false;
    while (j < out.length && out[j].type === "choice") {
      let k = j + 1;
      while (k < out.length && out[k].type !== "choice" && out[k].type !== "gather" && out[k].type !== "knot") k++;
      choices.push({ label: out[j].label, bodyStart: j + 1, bodyEnd: k - 1 });
      if (k < out.length && out[k].type === "choice") { j = k; continue; }
      const gatherPc = k < out.length && out[k].type === "gather" ? k : null;
      choiceGroups[groupStart] = { choices, gatherPc };
      j = k;
      terminated = true;
      break;
    }
    gi = terminated ? j : gi + 1;
  }

  return { frontmatter, lines: out, knots, vars, choiceGroups };
}

/* ============ 两态机 ============ */
const MAX_STEPS = 1000;

/* 解析所有文件（一次），构建 knots 索引 */
const FILES = new Map();
const KNOTS = new Map();
for (const [filename, raw] of Object.entries(DATA.files)) {
  const parsed = parseScript(raw.lines.join("\n"));
  FILES.set(filename, parsed);
  for (const [name, pc] of Object.entries(parsed.knots)) {
    KNOTS.set(name, { file: filename, pc });
  }
}

const VARIABLES = DATA.variables;
const BUILTINS_KEYS = () => ({});

function initValues() {
  const init = {};
  for (const v of VARIABLES) init[v.key] = v.default !== undefined && v.default !== null ? v.default : null;
  return init;
}

function createInitialState() {
  const entryName = DATA.scenario.entry_knot;
  const entry = entryName ? KNOTS.get(entryName) : null;
  if (!entry) return { error: "剧情没有可进入的 knot" };
  const fm = FILES.get(entry.file).frontmatter;
  return {
    state: {
      file: entry.file,
      knot: entryName,
      pc: entry.pc,
      values: initValues(),
      visited: {},
      displayLine: null,
      choices: [],
      currentChoiceGroupStart: null,
      choiceBodyEnd: null,
      gatherPc: null,
      bg: fm.bg || null,
      bgm: fm.bgm || null,
      glue: false,
      ended: false,
    },
    error: null,
  };
}

/* 推进一步：扫描指令行直到产生显示行 / 选项组 / 结束 / 错误。纯函数。 */
function continueStep(state) {
  let { file, knot, pc } = state;
  let { values, visited, displayLine, glue } = state;
  let { currentChoiceGroupStart, choiceBodyEnd, gatherPc } = state;
  let { bg, bgm } = state;
  const sfx = [];

  const snap = (overrides) => Object.assign({
    file, knot, pc, values, visited, displayLine, choices: [],
    currentChoiceGroupStart, choiceBodyEnd, gatherPc, bg, bgm, glue, ended: false,
  }, overrides || {});

  for (let i = 0; i < MAX_STEPS; i++) {
    if (choiceBodyEnd !== null && pc > choiceBodyEnd) {
      if (gatherPc !== null) {
        pc = gatherPc;
        choiceBodyEnd = null;
        gatherPc = null;
        currentChoiceGroupStart = null;
        continue;
      }
      choiceBodyEnd = null;
      gatherPc = null;
      currentChoiceGroupStart = null;
    }

    const script = file !== null ? FILES.get(file) : null;
    if (!script) return { state: null, sfx, error: "文件 " + file + " 不存在" };
    const line = script.lines[pc];
    if (!line) {
      return {
        state: snap({
          displayLine: null, currentChoiceGroupStart: null,
          choiceBodyEnd: null, gatherPc: null, ended: true,
        }),
        sfx, error: null,
      };
    }

    switch (line.type) {
      case "knot":
        visited = Object.assign({}, visited);
        visited[line.name] = (visited[line.name] || 0) + 1;
        knot = line.name;
        pc++;
        break;

      case "var":
        pc++;
        break;

      case "assign":
        applyAssign(line.key, line.op, line.value, values);
        pc++;
        break;

      case "condition":
        if (tryCond(line.expr, values, visited) && line.text) {
          displayLine = mergeGlue(glue, displayLine, line);
          glue = false;
          return { state: snap({ pc: pc + 1, displayLine, glue }), sfx, error: null };
        }
        pc++;
        break;

      case "glue":
        glue = true;
        pc++;
        break;

      case "bg":
        bg = line.image;
        pc++;
        break;

      case "bgm":
        bgm = line.file;
        pc++;
        break;

      case "sfx":
        sfx.push(line.file);
        pc++;
        break;

      case "scene_ref":
      case "actor_ref":
        pc++;
        break;

      case "jump": {
        if (line.target === "END") {
          return {
            state: snap({
              displayLine: null, currentChoiceGroupStart: null,
              choiceBodyEnd: null, gatherPc: null, ended: true,
            }),
            sfx, error: null,
          };
        }
        const target = KNOTS.get(line.target);
        if (!target) return { state: null, sfx, error: "找不到 knot：" + line.target };
        file = target.file;
        pc = target.pc;
        choiceBodyEnd = null;
        gatherPc = null;
        currentChoiceGroupStart = null;
        break;
      }

      case "choice": {
        const group = script.choiceGroups[pc];
        if (!group) { pc++; break; }
        return {
          state: snap({
            choices: group.choices.map((c, idx) => ({ label: c.label, index: idx })),
            currentChoiceGroupStart: pc, choiceBodyEnd: null, gatherPc: null,
          }),
          sfx, error: null,
        };
      }

      case "gather":
        if (line.text) {
          displayLine = mergeGlue(glue, displayLine, line);
          glue = false;
          return {
            state: snap({
              pc: pc + 1, displayLine, glue,
              currentChoiceGroupStart: null, choiceBodyEnd: null, gatherPc: null,
            }),
            sfx, error: null,
          };
        }
        pc++;
        break;

      default: {
        const resolved = resolveInline(line, values, visited);
        displayLine = mergeGlue(glue, displayLine, resolved);
        glue = false;
        return { state: snap({ pc: pc + 1, displayLine, glue }), sfx, error: null };
      }
    }
  }

  return { state: null, sfx, error: "剧本推进超过 " + MAX_STEPS + " 步" };
}

/* 选择一个选项：pc 落到该选项 body 起点。只改 pc 与 body / gather / 组起点。 */
function chooseStep(state, choiceIndex) {
  const script = state.file !== null ? FILES.get(state.file) : null;
  const group = script && state.currentChoiceGroupStart !== null
    ? script.choiceGroups[state.currentChoiceGroupStart] : null;
  const choice = group ? group.choices[choiceIndex] : null;
  if (!group || !choice) return state;
  return Object.assign({}, state, {
    pc: choice.bodyStart,
    choiceBodyEnd: choice.bodyEnd,
    gatherPc: group.gatherPc,
    choices: [],
  });
}

function mergeGlue(glue, prev, line) {
  if (glue && prev && "text" in prev && "text" in line) {
    return Object.assign({}, prev, { text: prev.text + "\n" + line.text });
  }
  return line;
}

/* 行内条件渲染前求值：按源码位置扫描 {} 跨度，非条件跨度原样保留 */
function resolveInline(line, values, visited) {
  if (line.type !== "narration" && line.type !== "say" && line.type !== "action") return line;
  const inline = line.inline;
  if (!inline || inline.length === 0) return line;

  const text = line.text;
  let out = "";
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open === -1) { out += text.slice(i); break; }
    const close = text.indexOf("}", open + 1);
    if (close === -1) { out += text.slice(i); break; }
    const cond = parseInlineInner(text.slice(open + 1, close));
    if (!cond) { out += text.slice(i, close + 1); i = close + 1; continue; }
    out += text.slice(i, open);
    out += String(tryCond(cond.expr, values, visited) ? cond.then : cond.else);
    i = close + 1;
  }

  const resolved = Object.assign({}, line, { text: out });
  delete resolved.inline;
  return resolved;
}

/* ============ 渲染 ============ */
let titleEl, descEl, sceneHost, choicesEl, endingHost, hintEl, bgEl;
let phase = "line";
let typewriter = null;
let lastTextEl = null;
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

function displayLine(line) {
  const { el: lineEl, textEl } = createLineEl(line);
  sceneHost.appendChild(lineEl);
  lineEl.scrollIntoView({ behavior: "smooth", block: "end" });
  const text = line.text || "";
  if (runtimeState.glue && lastTextEl) {
    lastTextEl.textContent += (lastTextEl.textContent ? "\n" : "") + text;
    runtimeState.glue = false;
    return;
  }
  runtimeState.glue = false;
  lastTextEl = textEl;
  startTypewriter(text, textEl);
}

function showEnding() {
  phase = "ending";
  choicesEl.innerHTML = "";
  endingHost.innerHTML = "";
  const fm = runtimeState.file !== null ? FILES.get(runtimeState.file).frontmatter : {};
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
      runtimeState = chooseStep(runtimeState, c.index);
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
    const result = continueStep(runtimeState);
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
  lastTextEl = null;
  bgEl = null;
  const init = createInitialState();
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

fn render_html(data: &ExportData) -> anyhow::Result<String> {
    let json = serde_json::to_string(data)?;
    let json_safe = json.replace("</", "<\\/");
    let title = html_escape(&data.scenario.name);
    Ok(HTML_TEMPLATE
        .replace("__TITLE__", &title)
        .replace("__DATA__", &json_safe))
}
