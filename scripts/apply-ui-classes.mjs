/**
 * 把「该用类 / 已被全局 CSS 接管」的内联样式替换掉。
 * 零依赖。用法：
 *   node scripts/apply-ui-classes.mjs           干跑，只报告
 *   node scripts/apply-ui-classes.mjs --write   实际写入
 *
 * 只做**语义等价**的替换，不做视觉改动。规则全部是字面匹配，
 * 匹配不上就跳过并报告 —— 宁可漏，不可错。人改会漏，脚本改会错，
 * 所以脚本必须保守：每条规则都要能被 tsc 与构建验证兜住。
 *
 * 这个脚本是一次性的（替换完就没用了），但保留在仓库里说明
 * 「当初哪些模式被机械替换过」，方便复查。
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";

const WRITE = process.argv.includes("--write");

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.tsx$/.test(p)) files.push(p);
  }
})("src");

/** 整行删除型：这一行删掉之后语义不变 */
const DROP_LINE = [
  {
    name: "accentColor 单行（已由 index.css 全局接管）",
    re: /^\s*style=\{\{\s*accentColor:\s*"var\(--accent-gold\)"\s*\}\}\s*$/,
  },
  {
    name: "accentColor 块内行（已由 index.css 全局接管）",
    re: /^\s*accentColor:\s*"var\(--accent-gold\)",\s*$/,
  },
];

/**
 * 整块替换型：style={{ … }} → className="…"
 * 指纹是**归一化后完整相等**才替换，多一个属性都不换 —— 否则会静默丢样式。
 * 每条的类定义都与指纹严格等价（见 index.css 工具类段）。
 */
const EXACT_CLASS = [
  /* 小号按钮：底栏、行内动作常见的 11px + 2/8 内边距。
     命中时若标签已有 className（.btn / .btn btn-ghost …）就并进去。 */
  { cls: "btn-sm", fp: 'fontSize:11,padding:"2px8px"' },
  { cls: "grow", fp: 'flex:1,minWidth:0' },
  { cls: "fill", fp: 'flex:1,minHeight:0,display:"flex"' },
  { cls: "list-reset", fp: 'listStyle:"none",padding:0,margin:0' },
  { cls: "muted", fp: 'fontSize:12,color:"var(--fg-muted)"' },
  { cls: "muted", fp: 'color:"var(--fg-muted)",fontSize:12' },
  { cls: "mono", fp: 'fontFamily:"var(--font-mono)"' },
  { cls: "title-font", fp: 'fontFamily:"var(--font-title)"' },
  { cls: "secondary", fp: 'color:"var(--fg-secondary)"' },
  { cls: "spacer", fp: 'marginLeft:"auto"' },
];

/**
 * 集合相等型：属性**顺序不定**但必须恰好是这几条，多一个少一个都不换。
 * 用于 .truncate 这种由三个属性共同构成的语义（少 whiteSpace 就不是截断）。
 */
const SET_CLASS = [
  {
    cls: "truncate",
    props: [
      'overflow:"hidden"',
      'textOverflow:"ellipsis"',
      'whiteSpace:"nowrap"',
    ],
  },
  {
    cls: "grow",
    props: ["flex:1", "minWidth:0"],
  },
  /* 「弹性 + 截断」：列表里的主文本那一列几乎都是这五条一起出现。
     两个类叠加正好等价于它 —— 拆成两条规则会各自匹配不上（都多属性），
     所以作为一条组合规则写在这里。 */
  {
    cls: "grow truncate",
    props: [
      "flex:1",
      "minWidth:0",
      'overflow:"hidden"',
      'textOverflow:"ellipsis"',
      'whiteSpace:"nowrap"',
    ],
  },
];

/**
 * 归一化成指纹。
 * 末尾那个 `}` 必须剥掉：块扫描从 `style=` 后的第一个 `{` 起计数（偏移 6），
 * 这样收尾时 j 停在外层 `}`，raw 就会把内层 `}` 一起带进来。
 * 不剥的话每条指纹都得写成 `flex:1,minWidth:0}`，且 splitProps 会多出一个
 * 空片段让条数对不上 —— 表现是全表匹配 0 处，很隐蔽。
 */
const norm = (s) => s.replace(/\s+/g, "").replace(/,$/, "").replace(/\}$/, "");

/** 把样式块拆成顶层属性数组。值里带逗号的复杂值（boxShadow 等）会拆错，
 *  所以只对属性数很少的块用，且要求拆出的条数与目标一致。 */
function splitProps(raw) {
  const n = norm(raw);
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of n) {
    if (ch === "{" || ch === "(") depth++;
    else if (ch === "}" || ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function matchSet(raw) {
  const parts = splitProps(raw);
  for (const rule of SET_CLASS) {
    if (parts.length !== rule.props.length) continue;
    const a = [...parts].sort();
    const b = [...rule.props].sort();
    if (a.every((v, i) => v === b[i])) return rule.cls;
  }
  return null;
}

/**
 * 找出 style 属性所在 JSX 标签的范围，用来检查是否已有 className。
 * 两个 className 属性会让后者静默覆盖前者，所以有冲突就跳过交给人工。
 * `=>` 不算标签结束，否则箭头函数会误判。
 */
function tagRange(src, from) {
  let start = -1;
  for (let i = from; i >= 0 && i > from - 1200; i--) {
    if (src[i] === "<") {
      start = i;
      break;
    }
    if (src[i] === ">" && src[i - 1] !== "=") break;
  }
  let end = -1;
  for (let i = from; i < src.length && i < from + 1200; i++) {
    if (src[i] === ">" && src[i - 1] !== "=") {
      end = i;
      break;
    }
  }
  return { start, end };
}

let totalEdits = 0;
const byRule = new Map();

for (const f of files) {
  const src = readFileSync(f, "utf8");

  // ── 第一遍：精确块 → className ──
  let out = src;
  let changed = 0;
  const conflicts = [];

  // 从后往前替换，避免位置偏移
  const blocks = [];
  let i = 0;
  while ((i = out.indexOf("style={{", i)) >= 0) {
    let d = 0;
    // i+6 是 `style=` 后的第一个 `{`。从第二个 `{` 开始数会少算一层，
    // 导致替换后残留一个 `}` —— 早期版本踩过，别再改回去。
    let j = i + 6;
    for (; j < out.length; j++) {
      const ch = out[j];
      if (ch === "{") d++;
      else if (ch === "}") {
        d--;
        if (d === 0) break;
      }
    }
    if (j < out.length) blocks.push({ start: i, end: j + 1, raw: out.slice(i + 8, j) });
    i = j + 1;
  }

  for (const b of [...blocks].reverse()) {
    const key = norm(b.raw);
    const hit =
      EXACT_CLASS.find((r) => r.fp === key) ??
      matchSet(b.raw);
    if (!hit) continue;
    const cls = typeof hit === "string" ? hit : hit.cls;

    const { start, end } = tagRange(out, b.start);
    if (start < 0 || end < 0) {
      conflicts.push(`标签边界识别失败：${out.slice(b.start, b.start + 40)}`);
      continue;
    }
    const tag = out.slice(start, end + 1);

    // 已有字面 className → 合并进去（.btn .btn-sm 这类叠加态）。
    // 只有一个 className 属性时后者会静默覆盖前者，所以必须合并而不是新增。
    // className={…} 表达式无法安全改写，跳过交给人工。
    const lit = /className="([^"]*)"/.exec(tag);
    if (lit) {
      if (lit[1].split(/\s+/).includes(cls)) {
        // 已经有这个类，只需删掉多余的内联块
        out = out.slice(0, b.start) + out.slice(b.end);
        changed++;
        byRule.set(`→ .${cls}（已存在，删内联）`, (byRule.get(`→ .${cls}（已存在，删内联）`) ?? 0) + 1);
        continue;
      }
      // 一步到位：先从标签里摘掉 style 块（连它前面的缩进空白一起），
      // 再把类并进已有的 className。分两步做会因为字符串长度变化而错位。
      let s = b.start - start;
      while (s > 0 && /\s/.test(tag[s - 1])) s--;
      const tagNew = tag.slice(0, s) + tag.slice(b.end - start);
      const merged = `className="${lit[1]} ${cls}"`;
      out = out.slice(0, start) + tagNew.replace(lit[0], merged) + out.slice(end + 1);
      changed++;
      byRule.set(`→ .${cls}（合并）`, (byRule.get(`→ .${cls}（合并）`) ?? 0) + 1);
      continue;
    }
    if (tag.includes("className")) {
      conflicts.push(`className 是表达式，跳过：${tag.replace(/\s+/g, " ").slice(0, 60)}`);
      continue;
    }

    out = out.slice(0, b.start) + `className="${cls}"` + out.slice(b.end);
    changed++;
    byRule.set(`→ .${cls}`, (byRule.get(`→ .${cls}`) ?? 0) + 1);
  }

  // ── 第二遍：整行删除 ──
  const lines = out.split("\n");
  const kept = [];
  for (const line of lines) {
    let dropped = false;
    for (const rule of DROP_LINE) {
      if (rule.re.test(line)) {
        dropped = true;
        changed++;
        byRule.set(rule.name, (byRule.get(rule.name) ?? 0) + 1);
        break;
      }
    }
    if (!dropped) kept.push(line);
  }
  out = kept.join("\n");

  if (changed > 0) {
    totalEdits += changed;
    console.log(`${WRITE ? "改" : "将改"} ${changed} 处  ${f}`);
    for (const c of conflicts) console.log(`      跳过：${c}`);
    if (WRITE) writeFileSync(f, out, "utf8");
  }
}

console.log(`\n合计 ${totalEdits} 处`);
for (const [k, v] of byRule) console.log(`    ${v}  ${k}`);
if (!WRITE) console.log("\n（干跑。加 --write 实际写入）");
