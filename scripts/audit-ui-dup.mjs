/**
 * 定位「该用组件 / 该用类却抄了内联样式」的具体位置。
 * 零依赖。用法：node scripts/audit-ui-dup.mjs
 *
 * audit-ui-tokens.mjs 回答「token 该取哪些档」，
 * 这个脚本回答「哪些地方该换成组件或类」—— 给出文件与行号，可直接下手。
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

/** 归一化：把样式块压成单行去空白，便于比对 */
const norm = (s) => s.replace(/\s+/g, "").replace(/,$/, "");

// 需要定位的目标模式：名字 → 归一化后的指纹特征（子串匹配）
const TARGETS = {
  "空态卡 → <EmptyState>": "padding:24,textAlign:\"center\",color:\"var(--fg-muted)\",fontSize:12,border:\"1pxdashedvar(--border-default)\"",
  "分区标题 → <SectionLabel>": "fontSize:10,color:\"var(--fg-muted)\",textTransform:\"uppercase\",letterSpacing:1",
  "弹性+截断 → .grow": "flex:1,minWidth:0",
  "伸缩容器 → .fill": "flex:1,minHeight:0,display:\"flex\"",
  "省略号 → .truncate": "textOverflow:\"ellipsis\"",
  "徽章 → .badge": "fontSize:11,padding:\"2px8px\"",
  "列表重置 → .list-reset": "listStyle:\"none\",padding:0,margin:0",
  "弱色小字 → .muted": "fontSize:12,color:\"var(--fg-muted)\"",
  "复选框强调色 → 全局 CSS": "accentColor:\"var(--accent-gold)\"",
};

for (const f of files) {
  const c = readFileSync(f, "utf8");
  const lines = c.split("\n");
  let i = 0;
  const hits = [];
  while ((i = c.indexOf("style={{", i)) >= 0) {
    let d = 0;
    let j = i + 7;
    for (; j < c.length; j++) {
      const ch = c[j];
      if (ch === "{") d++;
      else if (ch === "}") {
        d--;
        if (d === 0) break;
      }
    }
    if (j < c.length) {
      const raw = c.slice(i + 8, j);
      const line = c.slice(0, i).split("\n").length;
      hits.push({ line, key: norm(raw) });
    }
    i = j + 1;
  }
  for (const [label, sig] of Object.entries(TARGETS)) {
    const matched = hits.filter((h) => h.key.includes(sig));
    if (matched.length > 0) {
      console.log(
        `${label}  ${f}:${matched.map((m) => m.line).join(",")}`,
      );
    }
  }
}
