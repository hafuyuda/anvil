export type {
  ParsedScript,
  ScriptFrontmatter,
  ScriptLine,
} from "./types";

export { EMPTY_SCRIPT } from "./types";

export { parseScript } from "./parser";
export { serializeScript } from "./serializer";