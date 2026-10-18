/** 行内条件：渲染前按源码位置替换。 */
export interface InlineCond {
  expr: string;
  then: string;
  else: string;
}

export type ScriptLine =
  | { type: "knot"; name: string }
  | { type: "var"; key: string; literal: string }
  | { type: "narration"; text: string; inline?: InlineCond[] }
  | {
      type: "say";
      speaker: string;
      portrait?: string;
      text: string;
      inline?: InlineCond[];
    }
  | { type: "action"; text: string; inline?: InlineCond[] }
  | { type: "bg"; image: string }
  | { type: "bgm"; file: string }
  | { type: "sfx"; file: string }
  | { type: "scene_ref"; cardName: string }
  | { type: "actor_ref"; cardName: string }
  | { type: "jump"; target: string }
  | { type: "choice"; label: string }
  | { type: "gather"; text: string }
  | { type: "condition"; expr: string; text: string }
  | { type: "assign"; key: string; op: "=" | "+=" | "-="; value: string }
  | { type: "glue" };

export interface ScriptFrontmatter {
  bg?: string;
  bgm?: string;
  is_ending?: boolean;
  ending_name?: string;
}

export interface ScriptKnot {
  name: string;
  pc: number;
  scene?: string;
  actors: string[];
}

export interface ChoiceGroup {
  choices: { label: string; bodyStart: number; bodyEnd: number }[];
  gatherPc: number | null;
}

export interface ParsedScript {
  frontmatter: ScriptFrontmatter;
  lines: ScriptLine[];
  knots: Record<string, ScriptKnot>;
  vars: { key: string; literal: string }[];
  /** key = 组内第一个 * 行的 pc */
  choiceGroups: Record<number, ChoiceGroup>;
}

export const EMPTY_SCRIPT: ParsedScript = {
  frontmatter: {},
  lines: [],
  knots: {},
  vars: [],
  choiceGroups: {},
};
