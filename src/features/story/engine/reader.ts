import type { VariableDef } from "../../../core/ipc";
import type { ParsedScript, ScriptFrontmatter } from "../script/types";
import { parseScript } from "../script/parser";
import {
  buildKnotIndex,
  chooseStep,
  continueStep,
  createInitialState,
  varsToVariables,
  type RuntimeState,
  type StepResult,
} from "./machine";

/**
 * 从「一堆原始剧本文件」构建可播放的剧本 —— 预览与导出共用的唯一入口。
 *
 * 导出侧过去是一段独立 JS：自己 parseScript、自己推 VAR 类型、自己建
 * knot 索引，于是同一套规则有三份实现。现在 Rust 只负责把文件原文与
 * 资源塞进 DATA，全部语义由本模块（打包成 reader_runtime.js）处理。
 *
 * 输入刻意只收「文件名 + 原始行」：这样导出不需要理解剧本语法，
 * 也不需要预解析。
 */
export interface ReaderSource {
  scenario: { entry_knot: string | null };
  /** 文件名 → 原始行（导出时由 Rust 填，按字典序） */
  files: Record<string, string[]>;
}

export interface Reader {
  /** 从 VAR 声明推导出的变量表（按首次声明顺序）。 */
  variables: VariableDef[];
  /** 当前运行时状态；构造失败或 reset 前为 null。 */
  state: RuntimeState | null;
  /** 构造期错误（无入口 knot 等）；与单步错误分开，便于 UI 区分。 */
  initialError: string | null;
  /** 回到入口 knot，返回新的初始状态。 */
  reset(): { state: RuntimeState | null; error: string | null };
  /** 推进一步（含连续指令行的扫描）。 */
  continue(): StepResult;
  /** 选择当前选项组里的第 index 项，只改 pc 等指针，不推进。 */
  choose(index: number): RuntimeState | null;
  /** 指定文件的 frontmatter（默认当前文件），用于结局名等。 */
  frontmatter(file?: string | null): ScriptFrontmatter;
}

/**
 * 文件解析结果按文件名字典序排列，重名 knot 后加载覆盖先加载 ——
 * 与预览侧 `usePlayState` 的加载顺序一致，不依赖 JSON 对象键序。
 */
function parseFiles(
  files: Record<string, string[]>,
): Map<string, ParsedScript> {
  const parsed = new Map<string, ParsedScript>();
  for (const name of Object.keys(files).sort()) {
    const lines = files[name];
    parsed.set(name, parseScript(Array.isArray(lines) ? lines.join("\n") : ""));
  }
  return parsed;
}

export function createReader(source: ReaderSource): Reader {
  const files = parseFiles(source.files ?? {});
  const { knots } = buildKnotIndex(files);
  const variables = varsToVariables([...files.values()].flatMap((f) => f.vars));

  // 入口：显式 entry_knot 优先（找不到即为错），否则字典序第一个文件的
  // 字典序最小 knot。
  const explicit = source.scenario?.entry_knot ?? null;
  const resolveEntry = ():
    | { entry: { file: string; knot: string; pc: number }; error: null }
    | { entry: null; error: string } => {
    if (explicit) {
      const hit = knots.get(explicit);
      return hit
        ? { entry: { file: hit.file, knot: explicit, pc: hit.pc }, error: null }
        : { entry: null, error: `找不到入口 knot：${explicit}` };
    }
    const firstFile = files.keys().next();
    if (!firstFile.done) {
      const script = files.get(firstFile.value);
      const firstKnot = script
        ? Object.keys(script.knots).sort()[0]
        : undefined;
      if (script && firstKnot) {
        return {
          entry: {
            file: firstFile.value,
            knot: firstKnot,
            pc: script.knots[firstKnot].pc,
          },
          error: null,
        };
      }
    }
    return { entry: null, error: "剧情没有可进入的 knot" };
  };

  const resolved = resolveEntry();
  const initialError = resolved.error;

  const buildInitial = (): RuntimeState | null => {
    if (!resolved.entry) return null;
    const fm = files.get(resolved.entry.file)?.frontmatter ?? {};
    return createInitialState({
      file: resolved.entry.file,
      knot: resolved.entry.knot,
      pc: resolved.entry.pc,
      variables,
      bg: fm.bg ?? null,
      bgm: fm.bgm ?? null,
    });
  };

  const reader: Reader = {
    variables,
    state: buildInitial(),
    initialError,

    reset() {
      const state = buildInitial();
      reader.state = state;
      return { state, error: state ? null : initialError };
    },

    continue() {
      if (!reader.state) {
        return {
          state: null,
          sfx: [],
          rolls: [],
          error: initialError ?? "剧情尚未初始化",
        };
      }
      const result = continueStep(reader.state, files, knots, variables);
      reader.state = result.state;
      return result;
    },

    choose(index: number) {
      if (!reader.state) return null;
      // chooseStep 在 index 非法时原样返回，这里保持同一语义
      reader.state = chooseStep(reader.state, files, index);
      return reader.state;
    },

    frontmatter(file?: string | null) {
      const target = file === undefined ? reader.state?.file : file;
      if (!target) return {};
      return files.get(target)?.frontmatter ?? {};
    },
  };

  return reader;
}
