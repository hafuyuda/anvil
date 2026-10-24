/**
 * 死代码审计：列出「项目里存在但没有任何人用」的东西。
 *
 *   node scripts/audit-deadcode.mjs          报告
 *   node scripts/audit-deadcode.mjs --strict 有问题时退出码 1（可接 CI）
 *
 * 为什么需要这个脚本：0.4.x 连续删过剧情边、规则集、战斗、帷幕、节点图，
 * 每次删除都会留下尾巴 —— 依赖、导出、样式、文档引用。靠人记住「上次删了
 * 什么」不可靠，靠 IDE 的 unused 提示也不够（它看不见跨文件的动态引用，
 * 也管不了 package.json）。这个脚本把「有没有尾巴」变成一条可重复执行的
 * 检查，与 §16.4 的防漂移闸门同一思路：不靠自觉，靠跑一遍。
 *
 * 三类检查：
 *   1. 导出符号：src 下 export 了但全项目（含测试）零引用的符号
 *   2. 依赖：package.json 声明了但 src 里没有任何 import 的包
 *   3. 样式类：CSS 里定义了但 tsx 里从未使用的类名
 *
 * 已知误报（需人工确认，脚本不会替你删）：
 *   - registry 模式（见 docs/RIGISTRY_PATTERN.md）靠数据驱动查表，
 *     符号名不出现在调用点，会被当成未引用。
 *   - Tauri 插件类依赖可能在 Rust 侧注册而前端无 import。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const strict = process.argv.includes("--strict");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const srcFiles = walk(path.join(root, "src")).filter((f) =>
  /\.tsx?$/.test(f),
);
const cssFiles = walk(path.join(root, "src")).filter((f) => /\.css$/.test(f));
const sources = srcFiles.map((f) => [f, readFileSync(f, "utf8")]);
const codeOnly = sources.filter(([f]) => !f.includes("__tests__"));
const tsxSources = sources.filter(([f]) => /\.tsx$/.test(f));

// ── 1. 未被引用的导出 ────────────────────────────────────────────
const declared = [];
const exportRe =
  /^export\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm;
for (const [file, code] of sources) {
  exportRe.lastIndex = 0;
  let m;
  while ((m = exportRe.exec(code))) declared.push({ name: m[1], file });
}

/**
 * 已知保留：符号当前无人引用，但属于某个模式的对称接口，删掉会破坏一致性。
 * 加进来必须写理由 —— 白名单是决策记录，不是偷懒的垃圾桶。
 */
const KEEP = {
  DEFAULT_CARD_BACK_STYLE: "styleRegistry 四件套（DEFAULT/get/list/has）之一",
  DEFAULT_FOIL_STYLE: "styleRegistry 四件套之一",
  DEFAULT_BUILTIN_THEME_ID: "styleRegistry 四件套之一",
  hasGridShape: "网格 registry 的 get/list/has/DEFAULT 对称接口",
  hasCardGroupView: "卡组视图 registry 的对称接口",
  hasCategory: "设置分类 registry 的对称接口",
  SystemEventKind: "事件种类词表，与 ChatEventKind 成对；注释记录了删了什么",
};

const unusedExports = [];
for (const { name, file } of declared) {
  if (name in KEEP) continue;
  const re = new RegExp(`\\b${name}\\b`, "g");
  let usedElsewhere = false;
  let selfCount = 0;
  for (const [f, code] of sources) {
    const n = (code.match(re) || []).length;
    if (n === 0) continue;
    if (f === file) selfCount = n;
    else usedElsewhere = true;
  }
  // 本文件只出现一次 = 只有定义，没有使用；且别的文件也没提过
  if (!usedElsewhere && selfCount <= 1) unusedExports.push({ name, file });
}

// ── 2. 未被 import 的依赖 ────────────────────────────────────────
const pkg = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
);
const deps = Object.keys(pkg.dependencies ?? {});
// 注意子路径导入：`@tauri-apps/api` 是以 `@tauri-apps/api/core` 的形式被引用的，
// 只比对完整包名会把在用依赖误报成死依赖。
const unusedDeps = deps.filter(
  (d) =>
    !sources.some(([, code]) =>
      new RegExp(`from\\s+["']${d.replace("/", "\\/")}(?:\\/[^"']*)?["']`).test(code),
    ),
);

// ── 3. 未被使用的 CSS 类 ─────────────────────────────────────────
const unusedClasses = [];
for (const file of cssFiles) {
  const css = readFileSync(file, "utf8");
  const re = /^\s*\.([a-zA-Z][\w-]*)/gm;
  let m;
  const seen = new Set();
  while ((m = re.exec(css))) seen.add(m[1]);
  for (const cls of seen) {
    // 类名常出现在模板串拼接处（`session-resize-handle${active ? " is-active" : ""}`），
    // 后面紧跟的是 `${` 而不是引号或空格，所以只做「类名前缀」匹配。
    const re = new RegExp(`["'\\s\`]${cls.replace(/-/g, "\\-")}(?![\\w-])`);
    const hit = tsxSources.some(([, code]) => re.test(code));
    if (!hit) unusedClasses.push({ name: cls, file });
  }
}

// ── 报告 ─────────────────────────────────────────────────────────
const rel = (f) => path.relative(root, f).replace(/\\/g, "/");
const line = "─".repeat(64);

console.log(line);
console.log(`死代码审计 · 扫描 ${srcFiles.length} 个源文件 / ${cssFiles.length} 个样式文件`);
console.log(line);

console.log(`\n[1] 未被任何文件引用的导出：${unusedExports.length} 个`);
for (const u of unusedExports) console.log(`    ${u.name}  @  ${rel(u.file)}`);

console.log(`\n[1b] 已知保留（白名单，见脚本内 KEEP）：${Object.keys(KEEP).length} 个`);
for (const [name, why] of Object.entries(KEEP)) console.log(`    ${name}  —  ${why}`);

console.log(`\n[2] package.json 里无 import 的依赖：${unusedDeps.length} 个`);
for (const d of unusedDeps) console.log(`    ${d}`);

console.log(`\n[3] CSS 里定义了但 tsx 未使用的类：${unusedClasses.length} 个`);
for (const c of unusedClasses) console.log(`    .${c.name}  @  ${rel(c.file)}`);

const total =
  unusedExports.length + unusedDeps.length + unusedClasses.length;
console.log(`\n${line}`);
console.log(
  total === 0
    ? "干净。没有发现死代码。"
    : `合计 ${total} 处待人工确认（registry 模式与插件类依赖可能误报）。`,
);
console.log(line);

process.exit(strict && total > 0 ? 1 : 0);
