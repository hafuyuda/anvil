import type {
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";

export interface CompletionSources {
  speakers: string[];
  scenes: string[];
  variables: string[];
  images: string[];
  audios: string[];
}

export const EMPTY_SOURCES: CompletionSources = {
  speakers: [],
  scenes: [],
  variables: [],
  images: [],
  audios: [],
};

export function storyCompletions(get: () => CompletionSources) {
  return (context: CompletionContext): CompletionResult | null => {
    const sources = get() ?? EMPTY_SOURCES;
    const line = context.state.doc.lineAt(context.pos);
    const before = line.text.slice(0, context.pos - line.from);

    // @bg / @bgm / @sfx 路径
    const at = before.match(/^@(bg|bgm|sfx)\s+(\S*)$/);
    if (at) {
      const list = at[1] === "bg" ? sources.images : sources.audios;
      return {
        from: context.pos - at[2].length,
        options: list.map((p) => ({ label: p, type: "text" })),
        validFor: /^\S*$/,
      };
    }

    // -> 场景名
    const jump = before.match(/^->\s*(\S*)$/);
    if (jump) {
      return {
        from: context.pos - jump[1].length,
        options: sources.scenes.map((s) => ({ label: s, type: "keyword" })),
        validFor: /^\S*$/,
      };
    }

    // ~ 变量名
    const assign = before.match(/^~\s*([a-zA-Z_]\w*)?$/);
    if (assign) {
      return {
        from: context.pos - (assign[1]?.length ?? 0),
        options: sources.variables.map((v) => ({ label: v, type: "variable" })),
        validFor: /^\w*$/,
      };
    }

    // ** 说话人
    const say = before.match(/^\*\*([^*]*)$/);
    if (say) {
      return {
        from: context.pos - say[1].length,
        options: sources.speakers.map((s) => ({
          label: s,
          type: "class",
          apply: `${s}**：`,
        })),
      };
    }

    // { 条件里的变量
    const cond = before.match(/^\{([a-zA-Z_]\w*)?$/);
    if (cond) {
      return {
        from: context.pos - (cond[1]?.length ?? 0),
        options: sources.variables.map((v) => ({ label: v, type: "variable" })),
        validFor: /^\w*$/,
      };
    }

    return null;
  };
}
