/**
 * 把剧本引擎打包成一段可内联的 IIFE，供导出的 HTML 使用。
 *
 *   src/features/story/engine/index.ts  →  src-tauri/src/core/store/reader_runtime.js
 *
 * 为什么需要这一步：导出件必须是**单文件、零外部依赖**的 HTML，而剧本
 * 语义只有一份 TS 实现。与其在 Rust 里再写一遍（历史做法），不如把唯一
 * 实现打成字符串，由 `export_html.rs` 用 include_str! 内联。
 *
 * 产物是生成文件，不要手改；`readerParity.test.ts` 会重新构建并逐字节
 * 比对，产物过期即测试失败。
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

/** 产物路径（相对仓库根） */
export const OUTPUT_REL = "src-tauri/src/core/store/reader_runtime.js";

const HEADER = `/* eslint-disable */
/* ---------------------------------------------------------------------------
 * GENERATED FILE — DO NOT EDIT.
 * 由 scripts/build-reader-runtime.mjs 从 src/features/story/engine/index.ts
 * 打包生成，内联进导出的 HTML。改语义请改 TS 源，然后 \`pnpm build:runtime\`。
 * --------------------------------------------------------------------------- */
`;

/** 构建产物代码（不写盘）。测试用它做逐字节比对。 */
export async function buildReaderRuntime() {
  const result = await build({
    configFile: false,
    root,
    logLevel: "error",
    build: {
      write: false,
      emptyOutDir: false,
      minify: false,
      target: "es2020",
      lib: {
        entry: path.join(root, "src/features/story/engine/index.ts"),
        formats: ["iife"],
        name: "AnvilReader",
        fileName: () => "reader_runtime.js",
      },
    },
  });
  const bundles = Array.isArray(result) ? result[0] : result;
  const chunk = bundles.output.find((o) => o.type === "chunk");
  if (!chunk) throw new Error("打包未产出 chunk");
  // 统一行尾，避免 Windows 检出/写盘造成 diff 噪音
  return HEADER + chunk.code.replace(/\r\n/g, "\n");
}

function digest(code) {
  return createHash("sha256").update(code).digest("hex").slice(0, 16);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const code = await buildReaderRuntime();
  const outPath = path.join(root, OUTPUT_REL);
  const check = process.argv.includes("--check");
  // 检出时的行尾转换（autocrlf）不该算作过期
  const normalized = (s) => s.replace(/\r\n/g, "\n");
  const existing = existsSync(outPath)
    ? normalized(readFileSync(outPath, "utf8"))
    : null;

  if (check) {
    if (existing === code) {
      console.log(`reader_runtime.js 与源码一致（sha256:${digest(code)}）`);
    } else {
      console.error(
        "reader_runtime.js 已过期：改过 src/features/story/engine 后必须运行 `pnpm build:runtime` 并提交产物。",
      );
      process.exit(1);
    }
  } else {
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, code, "utf8");
    console.log(
      `${OUTPUT_REL}  ${(Buffer.byteLength(code) / 1024).toFixed(1)} KB  sha256:${digest(code)}`,
    );
  }
}
