/**
 * UI token 审计：统计内联样式里数值类魔法数的真实分布，
 * 用来决定 spacing / type scale / radius token 该取哪些档位。
 *
 * 零依赖。用法：
 *   node scripts/audit-ui-tokens.mjs          报告现状
 *   node scripts/audit-ui-tokens.mjs --strict 有越界值则退出码 1（接 CI）
 *
 * 设计意图：token 不是凭空发明的，必须覆盖真实使用；反过来，token 定下之后
 * 不该再有裸数值野蛮生长 —— 那会让「改一处换全站」再次失效。
 * 这是防漂移闸门，和 audit-deadcode.mjs 同一个思路。
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.tsx$/.test(p)) files.push(p);
  }
})("src");

let all = "";
for (const f of files) all += readFileSync(f, "utf8");

function tally(pattern, label, topN = 14) {
  const counts = new Map();
  const re = new RegExp(pattern, "g");
  let m;
  while ((m = re.exec(all)) !== null) {
    const k = m[1];
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const shown = sorted.slice(0, topN).map(([k, v]) => `${k}=${v}`);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  console.log(`\n=== ${label}（共 ${total} 处，${counts.size} 种值）===`);
  console.log(shown.join("  "));
}

tally("fontSize:\\s*(\\d+)", "fontSize");
tally("gap:\\s*(\\d+)", "gap");
tally('padding:\\s*"([^"]+)"', "padding（字符串形式）");
tally("padding:\\s*(\\d+)", "padding（数字形式）");
tally("margin:\\s*(\\d+)", "margin（数字形式）");
tally("marginBottom:\\s*(\\d+)", "marginBottom");
tally("borderRadius:\\s*var\\((--[\\w-]+)\\)", "borderRadius token");
tally('borderRadius:\\s*"([^"]+)"', "borderRadius（字符串形式）");
tally("borderRadius:\\s*(\\d+)", "borderRadius（数字形式）");

// ── 越界检查：token 定下之后，裸数值就是漂移 ──
const STRICT = process.argv.includes("--strict");

/** 间距 token 允许的裸数值（对应 index.css 的 --sp-*） */
const SPACING_TOKENS = new Set([
  "0",
  "2",
  "4",
  "6",
  "8",
  "10",
  "12",
  "16",
  "20",
  "24",
  "32",
]);
/** 字号 token 允许的裸数值（对应 --fs-*）；长尾大字号不值得 token 化 */
const FONT_TOKENS = new Set(["10", "11", "12", "13", "14", "16", "20"]);

const SPACING_KEYS = [
  "gap",
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
];

const strays = new Map();
for (const key of SPACING_KEYS) {
  const re = new RegExp(`${key}:\\s*(\\d+)`, "g");
  let m;
  while ((m = re.exec(all)) !== null) {
    if (!SPACING_TOKENS.has(m[1])) {
      const k = `${key}: ${m[1]}`;
      strays.set(k, (strays.get(k) ?? 0) + 1);
    }
  }
}
{
  const re = /fontSize:\s*(\d+)/g;
  let m;
  while ((m = re.exec(all)) !== null) {
    if (!FONT_TOKENS.has(m[1])) {
      const k = `fontSize: ${m[1]}`;
      strays.set(k, (strays.get(k) ?? 0) + 1);
    }
  }
}

const straySorted = [...strays.entries()].sort((a, b) => b[1] - a[1]);
const strayTotal = [...strays.values()].reduce((a, b) => a + b, 0);
console.log(
  `\n=== token 之外的裸数值（${strays.size} 种，共 ${strayTotal} 处）===`,
);
if (straySorted.length === 0) {
  console.log("无 —— 全部落在 token 内");
} else {
  for (const [k, v] of straySorted) console.log(`    ${v}  ${k}`);
  console.log(
    "\n  这些是长尾。要么补进 index.css 的 --sp-* / --fs-*，要么确认它是孤例。",
  );
}

console.log(
  `\n[间距] 覆盖率 ${coverage(SPACING_TOKENS, SPACING_KEYS)}%` +
    `   [字号] 覆盖率 ${coverage(FONT_TOKENS, ["fontSize"])}%`,
);

function coverage(allowed, keys) {
  let inToken = 0;
  let total = 0;
  for (const key of keys) {
    const re = new RegExp(`${key}:\\s*(\\d+)`, "g");
    let m;
    while ((m = re.exec(all)) !== null) {
      total++;
      if (allowed.has(m[1])) inToken++;
    }
  }
  return total === 0 ? "100" : ((inToken / total) * 100).toFixed(1);
}

if (STRICT && strayTotal > 0) {
  console.error(`\n[FAIL] --strict：有 ${strayTotal} 处裸数值在 token 之外`);
  process.exit(1);
}
