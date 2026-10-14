export type ScriptLine =
  | { type: "narration"; text: string }
  | {
      type: "say";
      speaker: string;
      portrait?: string;
      text: string;
    }
  | { type: "action"; text: string }
  | { type: "bg"; image: string }
  | { type: "bgm"; file: string }
  | { type: "sfx"; file: string }
  | { type: "jump"; target: string }
  | { type: "condition"; expr: string; text: string }
  | { type: "assign"; key: string; op: "=" | "+=" | "-="; value: string }
  | { type: "glue" };

export interface ScriptFrontmatter {
  bg?: string;
  bgm?: string;
  is_ending?: boolean;
  ending_name?: string;
}

export interface ParsedScript {
  frontmatter: ScriptFrontmatter;
  lines: ScriptLine[];
}

export const EMPTY_SCRIPT: ParsedScript = {
  frontmatter: {},
  lines: [],
};
